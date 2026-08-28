<?php

namespace App\Services;

use App\Models\Order;
use App\Models\Payment;
use App\Mail\OrderConfirmed;
use App\Mail\PaymentApproved;
use Illuminate\Support\Facades\Mail;
use App\Models\ProductVariant;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class CheckoutService
{
    public function __construct(
        private CartService $cart,
        private MercadoPagoService $mercadoPago,
        private SuperFreteService $superFrete,
    ) {}

    public function createOrder(array $data): Order
    {
        $cart = $this->cart->load();

        if ($cart->items->isEmpty()) {
            throw ValidationException::withMessages(['cart' => 'Seu carrinho está vazio.']);
        }

        // 1. Se o frete estiver nulo ou se o CEP do checkout for diferente do gravado no carrinho, recalcula o frete automaticamente
        $zipCode = $data['ship_zipcode'] ?? null;

        if (is_null($cart->shipping_cents) || ($zipCode && $cart->shipping_cep !== $zipCode)) {
            if (! $zipCode) {
                throw ValidationException::withMessages([
                    'shipping' => 'Calcule o frete antes de finalizar o pedido.',
                ]);
            }

            try {
                $result = $this->superFrete->cheapestForCart($cart, $zipCode);

                $cart->update([
                    'shipping_cep'     => $zipCode,
                    'shipping_cents'   => $result['cents'],
                    'shipping_service' => $result['service'],
                ]);

                $cart->refresh();
            } catch (\Exception $e) {
                throw ValidationException::withMessages([
                    'ship_zipcode' => 'Não foi possível calcular o frete para o CEP informado. ' . $e->getMessage(),
                ]);
            }
        }

        return DB::transaction(function () use ($cart, $data) {

            $subtotal = 0;
            $rows     = [];

            foreach ($cart->items as $item) {
                // 🔒 lock: ninguém mexe nessa linha até o commit
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

                // 💰 preço SEMPRE do banco, nunca do front
                $unit  = (int) round($variant->price * 100);
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

            // Garante uso correto do is_null para suportar Frete Grátis (0 centavos)
            if (is_null($cart->shipping_cents)) {
                throw ValidationException::withMessages([
                    'shipping' => 'Calcule o frete antes de finalizar o pedido.',
                ]);
            }

            $shipping = (int) $cart->shipping_cents;
            $discount = (int) ($cart->discount_cents ?? 0);

            $order = Order::create([
                'code'              => Order::generateCode(),
                'user_id'           => Auth::id(),
                'status'            => 'pending',
                'coupon_id'         => $cart->coupon_id,
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
                'expires_at'        => now()->addMinutes((int) config('pix.expires_minutes')),
            ]);

            $order->items()->createMany($rows);

            $this->createPixPayment($order);

            $this->cart->clear();

            Mail::to($order->customer_email)->send(new OrderConfirmed($order));

            return $order->load(['items', 'payment']);
        });
    }

    private function createPixPayment(Order $order): Payment
    {
        $mp = $this->mercadoPago->createPixPayment($order);

        return $order->payments()->create([
            'method'            => 'pix',
            'status'            => 'pending',
            'amount_cents'      => $order->total_cents,
            'txid'              => $order->code,
            'pix_payload'       => $mp['pix_payload'],
            'pix_qr_base64'     => $mp['pix_qr_base64'],
            'provider'          => 'mercadopago',
            'provider_id'       => $mp['provider_id'],
            'provider_response' => $mp['raw'],
            'expires_at'        => $order->expires_at,
        ]);
    }

    /** Baixa de estoque acontece AQUI, na confirmação */
    public function confirmPayment(Payment $payment, array $providerData = []): Order
    {
        return DB::transaction(function () use ($payment, $providerData) {

            $payment->refresh();

            // idempotência: webhook pode chegar 2x
            if ($payment->status === 'paid') {
                return $payment->order;
            }

            $order = $payment->order()->lockForUpdate()->first();

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
                'paid_at'           => now(),
                'provider_response' => $providerData ?: null,
            ]);

            $order->update(['status' => 'paid', 'paid_at' => now()]);

            Mail::to($order->customer_email)->send(new PaymentApproved($order));

            return $order->fresh(['items', 'payment']);
        });
    }

    public function cancelOrder(Order $order): Order
    {
        DB::transaction(function() use ($order) {
            $order->update(['status' => 'canceled']);
            $order->payments()->where('status', 'pending')->update(['status' => 'canceled']);
        });

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
        }

        return $orders->count();
    }
}