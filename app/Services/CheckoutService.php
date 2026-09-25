<?php

namespace App\Services;

use App\Mail\PaymentApproved;
use App\Models\Coupon;
use App\Models\Order;
use App\Models\Payment;
use App\Models\ProductVariant;
use App\Models\WebhookEvent;
use App\Services\Stock\StockMovementService;
use Illuminate\Database\QueryException;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\ValidationException;
use RuntimeException;

class CheckoutService
{
    public function __construct(
        private CartService $cart,
        private GetnetService $getnet,
        private StockMovementService $stock,
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
        $method = $data['payment_method'];

        return DB::transaction(function () use ($cart, $data, $method) {
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

            $expiresAt = $this->expiresAtFor($method);

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
                'payment_method'    => $method,
            ]);

            $order->items()->createMany($rows);
            $this->createPayment($order->load('items'), $method);
            $this->cart->clear();

            app(OrderStatusService::class)->record(
                $order,
                'pending',
                'sistema',
                'Pedido criado. Aguardando confirmação do pagamento.'
            );

            return $order->load(['items', 'payment']);
        });
    }

    private function expiresAtFor(string $method): \Illuminate\Support\Carbon
    {
        return match ($method) {
            'pix'         => now()->addMinutes((int) config('pix.expires_minutes', 30)),
            'credit_card' => now()->addMinutes((int) config('pix.card_expires_minutes', 60)),
            default       => now()->addHours((int) config('pix.boleto_expires_hours', 72)),
        };
    }

    private function createPayment(Order $order, string $method): Payment
    {
        $charge = match ($method) {
            'pix'         => $this->getnet->createPixPayment($order),
            'boleto'      => $this->getnet->createBoletoPayment($order),
            'credit_card' => [
                'provider_id'   => null,
                'status'        => 'WAITING',
                'pix_payload'   => null,
                'pix_qr_base64' => null,
                'ticket_url'    => null,
                'barcode'       => null,
                'raw'           => ['method' => 'credit_card', 'awaiting_tokenization' => true],
            ],
            default => throw new RuntimeException('Metodo de pagamento invalido.'),
        };

        $raw = $this->getnet->sanitize($charge['raw'] ?? []);
        $raw['ticket_url'] = $charge['ticket_url'] ?? null;
        $raw['barcode'] = $charge['barcode'] ?? null;

        return $order->payments()->create([
            'method'            => $method,
            'status'            => 'pending',
            'provider_status'   => (string) ($charge['status'] ?? 'WAITING'),
            'amount_cents'      => (int) $order->total_cents,
            'txid'              => $order->code,
            'pix_payload'       => $charge['pix_payload'] ?? null,
            'pix_qr_base64'     => $charge['pix_qr_base64'] ?? null,
            'provider'          => 'getnet',
            'provider_id'       => $charge['provider_id'] ?: null,
            'provider_response' => $raw,
            'expires_at'        => $order->expires_at,
        ]);
    }

    public function chargeCardPayment(Order $order, array $tokenized): Order
    {
        return DB::transaction(function () use ($order, $tokenized) {
            $order = Order::where('id', $order->id)->lockForUpdate()->firstOrFail();
            $payment = $order->payment()->lockForUpdate()->first();

            if (! $payment || $payment->method !== 'credit_card') {
                throw ValidationException::withMessages([
                    'card' => 'Este pedido nao aceita pagamento com cartao.',
                ]);
            }

            if ($order->status === 'paid' || $payment->status === 'paid') {
                return $order->fresh(['items', 'payment']);
            }

            if (! in_array($order->status, ['pending'], true) || $order->isExpired()) {
                throw ValidationException::withMessages([
                    'card' => 'Este pedido nao pode mais ser pago.',
                ]);
            }

            $result = $this->getnet->chargeCard($order, $tokenized);
            $mapped = $this->getnet->mapStatus($result['status']);

            $payment->update([
                'provider_id'       => $result['provider_id'] ?: $payment->provider_id,
                'provider_status'   => $result['status'],
                'provider_response' => array_merge($payment->provider_response ?? [], $result['raw'] ?? []),
            ]);

            if ($mapped === GetnetService::STATUS_PAID) {
                return $this->confirmPayment($payment->fresh(), [
                    'id'          => $result['provider_id'],
                    'amount'      => $result['amount'],
                    'paid_method' => 'credit_card',
                    'status'      => $result['status'],
                ]);
            }

            $payment->update(['status' => 'failed']);

            throw ValidationException::withMessages([
                'card' => 'Pagamento recusado. Verifique os dados do cartao ou tente outro.',
            ]);
        });
    }

    public function syncFromGetnet(Payment $payment): Order
    {
        if (! $payment->provider_id) {
            return $payment->order;
        }

        $kind = match ($payment->method) {
            'pix'         => 'pix',
            'boleto'      => 'boleto',
            'credit_card' => 'credit',
            default       => 'auto',
        };

        $data = $this->getnet->fetchPayment($payment->provider_id, $kind);

        return $this->applyGetnetResult($payment, $data);
    }

    public function applyGetnetResult(Payment $payment, array $providerData): Order
    {
        $mapped = $this->getnet->mapStatus((string) ($providerData['status'] ?? ''));

        if ($mapped === GetnetService::STATUS_PAID) {
            $amount = $this->getnet->extractAmount($providerData);

            return $this->confirmPayment($payment, [
                'id'          => $providerData['payment_id'] ?? $providerData['id'] ?? $payment->provider_id,
                'amount'      => $amount,
                'paid_method' => $payment->method,
                'status'      => $providerData['status'] ?? null,
            ]);
        }

        return DB::transaction(function () use ($payment, $providerData, $mapped) {
            $payment = Payment::where('id', $payment->id)->lockForUpdate()->first();
            $order = $payment->order()->lockForUpdate()->first();

            if (! $order || $payment->status === 'paid' || $order->status === 'paid') {
                return $order ?? $payment->order;
            }

            $payment->update([
                'provider_status'   => (string) ($providerData['status'] ?? $payment->provider_status),
                'provider_response' => array_merge(
                    $payment->provider_response ?? [],
                    $this->getnet->sanitize($providerData)
                ),
            ]);

            if ($mapped === GetnetService::STATUS_DENIED && $order->status === 'pending') {
                $payment->update(['status' => 'failed']);
            }

            if ($mapped === GetnetService::STATUS_EXPIRED && $order->status === 'pending') {
                $order->update(['status' => 'expired']);
                $payment->update(['status' => 'expired']);
                app(OrderStatusService::class)->record($order, 'expired', 'getnet', 'Cobranca expirada na Getnet.');
            }

            if ($mapped === GetnetService::STATUS_CANCELED && $order->status === 'pending') {
                $order->update(['status' => 'canceled']);
                $payment->update(['status' => 'canceled']);
                app(OrderStatusService::class)->record($order, 'canceled', 'getnet', 'Cobranca cancelada na Getnet.');
            }

            return $order->fresh(['items', 'payment']);
        });
    }

    public function confirmPayment(Payment $payment, array $providerData = []): Order
    {
        return DB::transaction(function () use ($payment, $providerData) {
            $payment = Payment::where('id', $payment->id)->lockForUpdate()->first();

            if ($payment->status === 'paid') {
                return $payment->order;
            }

            $order = $payment->order()->lockForUpdate()->first();

            if (! $order) {
                throw new RuntimeException('Pedido do pagamento nao encontrado.');
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

                throw new RuntimeException('Valor do pagamento nao confere.');
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

                $this->stock->applyDelta(
                    $variant,
                    -1 * (int) $item->quantity,
                    \App\Models\StockMovement::TYPE_VENDA,
                    "Venda pedido {$order->code}",
                    $order->user_id,
                    $order
                );
            }

            $sanitized = $this->getnet->sanitize($providerData);

            $payment->update([
                'status'            => 'paid',
                'method'            => $providerData['paid_method'] ?? $payment->method,
                'provider_status'   => (string) ($providerData['status'] ?? 'APPROVED'),
                'paid_at'           => now(),
                'provider_id'       => isset($providerData['id'])
                    ? (string) $providerData['id']
                    : $payment->provider_id,
                'provider_response' => array_merge($payment->provider_response ?? [], $sanitized),
            ]);

            $order->update(['status' => 'paid', 'paid_at' => now()]);
            app(OrderStatusService::class)->record($order, 'paid', 'sistema', 'Pagamento confirmado.');

            Mail::to($order->customer_email)->send(new PaymentApproved($order));

            return $order->fresh(['items', 'payment']);
        });
    }

    public function processWebhook(array $payload, string $paymentId): array
    {
        $fingerprint = hash('sha256', 'getnet|'.$paymentId.'|'.json_encode($payload));

        try {
            $event = WebhookEvent::create([
                'provider'            => 'getnet',
                'fingerprint'         => $fingerprint,
                'provider_payment_id' => $paymentId,
                'payload'             => $this->getnet->sanitize($payload),
            ]);
        } catch (UniqueConstraintViolationException|QueryException $e) {
            $isUnique = $e instanceof UniqueConstraintViolationException
                || in_array((string) $e->getCode(), ['23000', '23505'], true);

            if (! $isUnique) {
                throw $e;
            }

            $event = WebhookEvent::where('fingerprint', $fingerprint)->first();

            if ($event?->processed_at) {
                return ['ok' => true, 'duplicate' => true];
            }

            if (! $event) {
                throw $e;
            }
        }

        $kind = 'auto';
        $local = Payment::where('provider', 'getnet')->where('provider_id', $paymentId)->first();

        if ($local) {
            $kind = match ($local->method) {
                'pix'         => 'pix',
                'boleto'      => 'boleto',
                'credit_card' => 'credit',
                default       => 'auto',
            };
        }

        $data = $this->getnet->fetchPayment($paymentId, $kind);
        $data['id'] = $data['payment_id'] ?? $data['id'] ?? $paymentId;

        $payment = $this->findGetnetPayment($data, $paymentId);

        if (! $payment) {
            Log::warning('Webhook Getnet: pagamento local nao encontrado', [
                'provider_id' => $paymentId,
                'order_id'    => $this->getnet->extractOrderCode($data),
            ]);

            $event->update(['processed_at' => now()]);

            return ['not_found' => true];
        }

        $amount = $this->getnet->extractAmount($data);

        if ($this->getnet->mapStatus((string) ($data['status'] ?? '')) === GetnetService::STATUS_PAID && $amount === null) {
            Log::critical('Webhook Getnet: amount ausente na consulta', [
                'provider_id' => $paymentId,
                'order'       => $payment->order?->code,
            ]);

            throw new RuntimeException('amount ausente');
        }

        $this->applyGetnetResult($payment, $data);

        $event->update([
            'order_code'    => $payment->order?->code,
            'mapped_status' => $this->getnet->mapStatus((string) ($data['status'] ?? '')),
            'processed_at'  => now(),
        ]);

        return ['ok' => true];
    }

    private function findGetnetPayment(array $data, string $paymentId): ?Payment
    {
        $found = Payment::where('provider', 'getnet')
            ->where('provider_id', $paymentId)
            ->first();

        if ($found) {
            return $found;
        }

        $orderCode = $this->getnet->extractOrderCode($data);

        if (! $orderCode) {
            return null;
        }

        $order = Order::where('code', $orderCode)->first();

        return $order?->payment;
    }

    public function cancelOrder(Order $order): Order
    {
        DB::transaction(function () use ($order) {
            $locked = Order::where('id', $order->id)->lockForUpdate()->first();

            if ($locked->status !== 'pending') {
                return;
            }

            $locked->update(['status' => 'canceled']);
            $locked->payments()->where('status', 'pending')->update(['status' => 'canceled']);
        });

        app(OrderStatusService::class)->record($order->fresh(), 'canceled', 'sistema', 'Pedido cancelado.');

        return $order->fresh();
    }

    public function cancelExpired(): int
    {
        $orders = Order::where('status', 'pending')
            ->whereNotNull('expires_at')
            ->where('expires_at', '<', now())
            ->get();

        foreach ($orders as $order) {
            DB::transaction(function () use ($order) {
                $locked = Order::where('id', $order->id)->lockForUpdate()->first();

                if ($locked->status !== 'pending') {
                    return;
                }

                $locked->update(['status' => 'expired']);
                $locked->payments()->where('status', 'pending')->update(['status' => 'expired']);
                app(OrderStatusService::class)->record($locked, 'expired', 'sistema', 'Pedido expirado por falta de pagamento.');
            });
        }

        return $orders->count();
    }

    public function paymentLabel(string $status, ?string $providerStatus = null): string
    {
        $mapped = $providerStatus ? $this->getnet->mapStatus($providerStatus) : $status;

        return match ($status === 'paid' ? GetnetService::STATUS_PAID : $mapped) {
            GetnetService::STATUS_PAID     => 'Pagamento confirmado',
            GetnetService::STATUS_DENIED   => 'Pagamento recusado',
            GetnetService::STATUS_EXPIRED  => 'Pagamento expirado',
            GetnetService::STATUS_CANCELED => 'Pagamento cancelado',
            default                        => 'Pagamento pendente',
        };
    }
}
