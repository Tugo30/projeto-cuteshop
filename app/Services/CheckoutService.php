<?php

namespace App\Services;

use App\Models\Order;
use App\Models\Payment;
use App\Mail\OrderConfirmed;
use App\Mail\PaymentApproved;
use App\Models\Coupon;
use Illuminate\Support\Facades\Mail;
use App\Models\ProductVariant;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Log;

class CheckoutService
{
    public function __construct(
        private CartService $cart,
        private GetnetService $getnet,
    ) {}

    public function createOrder(array $data): Order
    {
        $cart = $this->cart->load();

        if ($cart->items->isEmpty()) {
            throw ValidationException::withMessages(['cart' => 'Seu carrinho está vazio.']);
        }

        $zipCode = preg_replace('/\D/', '', (string) ($data['ship_zipcode'] ?? ''));
        $cartCep = preg_replace('/\D/', '', (string) $cart->shipping_cep);

        if ($cart->shipping_cents === null || ! filled($cart->shipping_service)) {
            throw ValidationException::withMessages([
                'shipping' => 'Selecione o frete na sacola antes de finalizar o pedido.',
            ]);
        }

        if ($zipCode === '' || $cartCep !== $zipCode) {
            throw ValidationException::withMessages([
                'ship_zipcode' => 'O CEP da entrega é diferente do frete calculado. Volte à sacola e calcule novamente.',
            ]);
        }

        $data['ship_zipcode'] = $zipCode;

        return DB::transaction(function () use ($cart, $data) {
            $subtotal = 0;
            $rows = [];

            foreach ($cart->items as $item) {
                $variant = ProductVariant::lockForUpdate()->find($item->product_variant_id);

                if (! $variant) {
                    throw ValidationException::withMessages([
                        'cart' => 'Um produto do carrinho não está mais disponível.',
                    ]);
                }

                if ($item->quantity > $variant->stock) {
                    throw ValidationException::withMessages([
                        'cart' => "Estoque insuficiente para {$variant->product->name} ({$variant->size}). Disponível: {$variant->stock}.",
                    ]);
                }

                $unit = (int) round($variant->price * 100);
                $total = $unit * $item->quantity;
                $subtotal += $total;

                $rows[] = [
                    'product_variant_id' => $variant->id,
                    'product_id'         => $variant->product_id,
                    'product_name'       => $variant->product->name,
                    'variant_size'       => $variant->size,
                    'product_image'      => $variant->product->image,
                    'unit_price_cents'   => $unit,
                    'quantity'           => $item->quantity,
                    'total_cents'        => $total,
                ];
            }

            $shipping = (int) $cart->shipping_cents;
            $discount = 0;
            $couponId = null;

            if ($cart->coupon_id) {
                $coupon = Coupon::query()
                    ->where('id', $cart->coupon_id)
                    ->where('active', true)
                    ->where(function ($q) {
                        $q->whereNull('validade')->orWhere('validade', '>=', now()->toDateString());
                    })
                    ->lockForUpdate()
                    ->first();

                if (! $coupon) {
                    throw ValidationException::withMessages(['coupon' => 'Cupom inválido ou expirado.']);
                }

                $reason = $coupon->isUsableBy(Auth::id());
                if ($reason) {
                    throw ValidationException::withMessages(['coupon' => $reason]);
                }

                $couponId = $coupon->id;

                $discount = $coupon->tipo === 'percentual'
                    ? (int) round($subtotal * ($coupon->valor / 100))
                    : (int) round($coupon->valor * 100);

                $discount = min($discount, $subtotal);
            }

            $expiresAt = now()->addHours((int) config('pix.boleto_expires_hours', 72));

            $order = Order::create([
                'code'              => Order::generateCode(),
                'user_id'           => Auth::id(),
                'status'            => 'pending',
                'coupon_id'         => $couponId,
                'shipping_service'  => $cart->shipping_service,
                'subtotal_cents'    => $subtotal,
                'shipping_cents'    => $shipping,
                'discount_cents'    => $discount,
                'total_cents'       => max(0, $subtotal - $discount + $shipping),
                'customer_name'     => $data['customer_name'],
                'customer_email'    => $data['customer_email'],
                'customer_phone'    => $data['customer_phone'] ?? null,
                'customer_document' => $data['customer_document'] ?? null,
                'ship_zipcode'      => $data['ship_zipcode'] ?? null,
                'ship_street'       => $data['ship_street'] ?? null,
                'ship_number'       => $data['ship_number'] ?? null,
                'ship_complement'   => $data['ship_complement'] ?? null,
                'ship_district'     => $data['ship_district'] ?? null,
                'ship_city'         => $data['ship_city'] ?? null,
                'ship_state'        => $data['ship_state'] ?? null,
                'expires_at'        => $expiresAt,
                'payment_method' => $data['payment_method']
            ]);

            $order->items()->createMany($rows);
            $this->createPayment($order->load('items'));
            $this->cart->clear();

            app(\App\Services\OrderStatusService::class)->record(
                $order,
                'pending',
                'sistema',
                'Pedido criado. Aguardando confirmação do pagamento.'
            );

            return $order->load(['items', 'payment']);
        });
    }

    private function createPayment(Order $order): Payment
    {
        $pix = $this->getnet->createPixPayment($order);
        $boleto = $this->getnet->createBoletoPayment($order);

        $raw = [
            'pix'        => $pix['raw'] ?? [],
            'boleto'     => $boleto['raw'] ?? [],
            'pix_id'     => $pix['provider_id'],
            'boleto_id'  => $boleto['provider_id'],
            'ticket_url' => $boleto['ticket_url'] ?? null,
            'barcode'    => $boleto['barcode'] ?? null,
        ];


        return $order->payments()->create([
            'method'             => 'getnet',
            'status'             => 'pending',
            'amount_cents'       => (int) $order->total_cents,
            'txid'               => $order->code,
            'pix_payload'        => $pix['pix_payload'],
            'pix_qr_base64'      => $pix['pix_qr_base64'],
            'provider'           => 'getnet',
            'provider_id'        => $pix['provider_id'] ?: $boleto['provider_id'],
            'provider_response'  => $raw,
            'expires_at'         => $order->expires_at,
        ]);
    }

    // chamado quando o token do cartão chega do front
    public function chargeCardPayment(Order $order, array $tokenized): Order
    {
        $payment = $order->payment()->where('method', 'credit_card')->firstOrFail();

        $result = $this->getnet->chargeCard($order, $tokenized);

        if (strtoupper($result['status']) === 'APPROVED') {
            return $this->confirmPayment($payment, [
                'id'          => $result['provider_id'],
                'amount'      => $result['amount'],
                'paid_method' => 'credit_card',
            ]);
        }

        $payment->update([
            'status'            => 'failed',
            'provider_id'       => $result['provider_id'],
            'provider_response' => array_merge($payment->provider_response ?? [], $result['raw'] ?? []),
        ]);

        throw ValidationException::withMessages([
            'card' => 'Pagamento recusado. Verifique os dados do cartão ou tente outro.',
        ]);
    }

    public function confirmPayment(Payment $payment, array $providerData = []): Order
    {
        return DB::transaction(function () use ($payment, $providerData) {
            $payment->refresh();

            if ($payment->status === 'paid') {
                return $payment->order;
            }

            $order = $payment->order()->lockForUpdate()->first();

            if (! $order) {
                throw new \RuntimeException('Pedido do pagamento nao encontrado.');
            }

            if (! in_array($order->status, ['pending', 'expired'], true)) {
                return $order;
            }

            $paidAmount = $providerData['amount'] ?? null;

            if ($paidAmount !== null && (int) $paidAmount !== (int) $order->total_cents) {
                Log::critical('Getnet: valor divergente', [
                    'order'    => $order->code,
                    'expected' => (int) $order->total_cents,
                    'got'      => (int) $paidAmount,
                ]);

                throw new \RuntimeException('Valor do pagamento nao confere.');
            }

            $order->load('items');

            foreach ($order->items as $item) {
                if (! $item->product_variant_id) {
                    continue;
                }

                $variant = ProductVariant::lockForUpdate()->find($item->product_variant_id);

                if (! $variant || $variant->stock < $item->quantity) {
                    throw ValidationException::withMessages([
                        'stock' => "Estoque esgotado para {$item->product_name} ({$item->variant_size}).",
                    ]);
                }

                $variant->decrement('stock', $item->quantity);
            }

            $payment->update([
                'status'            => 'paid',
                'method'            => $providerData['paid_method'] ?? $payment->method,
                'paid_at'           => now(),
                'provider_id'       => isset($providerData['id'])
                    ? (string) $providerData['id']
                    : $payment->provider_id,
                'provider_response' => array_merge($payment->provider_response ?? [], $providerData ?: []),
            ]);

            $order->update(['status' => 'paid', 'paid_at' => now()]);
            app(\App\Services\OrderStatusService::class)->record($order, 'paid', 'sistema', 'Pagamento confirmado.');

            Mail::to($order->customer_email)->send(new PaymentApproved($order));

            return $order->fresh(['items', 'payment']);
        });
    }

    public function cancelOrder(Order $order): Order
    {
        DB::transaction(function () use ($order) {
            $order->update(['status' => 'canceled']);
            $order->payments()->where('status', 'pending')->update(['status' => 'canceled']);
        });

        app(\App\Services\OrderStatusService::class)->record($order, 'canceled', 'sistema', 'Pedido cancelado.');

        return $order->fresh();
    }

    public function cancelExpired(): int
    {
        $orders = Order::where('status', 'pending')
            ->whereNotNull('expires_at')
            ->where('expires_at', '<', now())
            ->get();

        foreach ($orders as $order) {
            $order->update(['status' => 'expired']);
            $order->payments()->where('status', 'pending')->update(['status' => 'expired']);
            app(\App\Services\OrderStatusService::class)->record($order, 'expired', 'sistema', 'Pedido expirado por falta de pagamento.');
        }

        return $orders->count();
    }
}
