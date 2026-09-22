<?php

namespace App\Services;

use App\Models\Order;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

class MercadoPagoService
{
    private string $baseUrl = 'https://api.mercadopago.com';

    private function isFake(): bool
    {
        return (bool) config('services.mercadopago.fake', false);
    }

    private function publicUrl(): string
    {
        return rtrim((string) (config('services.mercadopago.public_url') ?: config('app.url')), '/');
    }

    public function createPixPayment(Order $order): array
    {
        if ($this->isFake()) {
            $fakePayload = '00020126580014BR.GOV.BCB.PIX0136123e4567-e89b-12d3-a456-42661417400052040000530398654041.005802BR5913TestStore6008SAO PAULO62070503***6304E2CA';

            return [
                'provider_id'   => 'local-' . $order->code,
                'status'        => 'pending',
                'pix_payload'   => $fakePayload,
                'pix_qr_base64' => null,
                'checkout_url'  => null,
                'ticket_url'    => null,
                'barcode'       => null,
                'raw'           => ['fake' => true, 'method' => 'pix'],
            ];
        }

        $response = Http::withToken(config('services.mercadopago.access_token'))
            ->withHeaders(['X-Idempotency-Key' => 'order-pix-' . $order->code])
            ->post("{$this->baseUrl}/v1/payments", [
                'transaction_amount' => round($order->total_cents / 100, 2),
                'description'        => "Pedido {$order->code}",
                'payment_method_id'  => 'pix',
                'external_reference' => $order->code,
                'notification_url'   => route('webhooks.mercadopago'),
                'payer'              => $this->payer($order),
                'date_of_expiration' => $order->expires_at->format('Y-m-d\TH:i:s.vP'),
            ]);

        if ($response->failed()) {
            throw new \RuntimeException('Não foi possível iniciar o pagamento. Tente de novo em instantes.');
        }

        $data = $response->json();
        $tx = $data['point_of_interaction']['transaction_data'] ?? [];

        return [
            'provider_id'   => (string) $data['id'],
            'status'        => $data['status'] ?? 'pending',
            'pix_payload'   => $tx['qr_code'] ?? null,
            'pix_qr_base64' => $tx['qr_code_base64'] ?? null,
            'checkout_url'  => null,
            'ticket_url'    => null,
            'barcode'       => null,
            'raw'           => $data,
        ];
    }

    public function createBoletoPayment(Order $order): array
    {
        if ($this->isFake()) {
            $barcode = '23793.38128 60000.000003 00000.000400 1 84470000010000';

            return [
                'provider_id'   => 'local-boleto-' . $order->code,
                'status'        => 'pending',
                'pix_payload'   => null,
                'pix_qr_base64' => null,
                'checkout_url'  => null,
                'ticket_url'    => null,
                'barcode'       => $barcode,
                'raw'           => ['fake' => true, 'method' => 'boleto', 'barcode' => $barcode],
            ];
        }

        $document = preg_replace('/\D/', '', (string) $order->customer_document);
        $payer = $this->payer($order);
        $payer['identification'] = [
            'type'   => strlen($document) === 14 ? 'CNPJ' : 'CPF',
            'number' => $document,
        ];
        $payer['address'] = [
            'zip_code'      => preg_replace('/\D/', '', (string) $order->ship_zipcode),
            'street_name'   => $order->ship_street,
            'street_number' => $order->ship_number,
            'neighborhood'  => $order->ship_district,
            'city'          => $order->ship_city,
            'federal_unit'  => $order->ship_state,
        ];

        $response = Http::withToken(config('services.mercadopago.access_token'))
            ->withHeaders(['X-Idempotency-Key' => 'order-boleto-' . $order->code])
            ->post("{$this->baseUrl}/v1/payments", [
                'transaction_amount' => round($order->total_cents / 100, 2),
                'description'        => "Pedido {$order->code}",
                'payment_method_id'  => 'bolbradesco',
                'external_reference' => $order->code,
                'notification_url'   => route('webhooks.mercadopago'),
                'payer'              => $payer,
                'date_of_expiration' => $order->expires_at->format('Y-m-d\TH:i:s.vP'),
            ]);

        if ($response->failed()) {
            throw new \RuntimeException('Não foi possível iniciar o pagamento. Tente de novo em instantes.');
        }

        $data = $response->json();

        return [
            'provider_id'   => (string) $data['id'],
            'status'        => $data['status'] ?? 'pending',
            'pix_payload'   => null,
            'pix_qr_base64' => null,
            'checkout_url'  => null,
            'ticket_url'    => data_get($data, 'transaction_details.external_resource_url')
                ?? data_get($data, 'point_of_interaction.transaction_data.ticket_url'),
            'barcode'       => data_get($data, 'barcode.content')
                ?? data_get($data, 'barcode')
                ?? data_get($data, 'transaction_details.barcode.content'),
            'raw'           => $data,
        ];
    }

    public function createCardCheckout(Order $order): array
    {
        $payUrl = $this->publicUrl().'/checkout/pagamento/'.$order->code;

        if ($this->isFake()) {
            return [
                'provider_id'   => 'local-pref-' . $order->code,
                'status'        => 'pending',
                'pix_payload'   => null,
                'pix_qr_base64' => null,
                'checkout_url'  => 'https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=local-'.$order->code,
                'ticket_url'    => null,
                'barcode'       => null,
                'raw'           => ['fake' => true, 'method' => 'credit_card', 'init_point' => $payUrl],
            ];
        }

        $items = $order->items->map(fn ($item) => [
            'id'          => (string) ($item->product_variant_id ?? $item->id),
            'title'       => mb_substr(($item->product_name ?? 'Produto').($item->variant_size ? " TAM {$item->variant_size}" : ''), 0, 256),
            'quantity'    => (int) $item->quantity,
            'unit_price'  => round($item->unit_price_cents / 100, 2),
            'currency_id' => 'BRL',
        ])->values()->all();

        if ($order->shipping_cents > 0) {
            $items[] = [
                'id'          => 'frete',
                'title'       => 'Frete'.($order->shipping_service ? " ({$order->shipping_service})" : ''),
                'quantity'    => 1,
                'unit_price'  => round($order->shipping_cents / 100, 2),
                'currency_id' => 'BRL',
            ];
        }

        if ($order->discount_cents > 0) {
            $items[] = [
                'id'          => 'desconto',
                'title'       => 'Desconto',
                'quantity'    => 1,
                'unit_price'  => -round($order->discount_cents / 100, 2),
                'currency_id' => 'BRL',
            ];
        }

        $response = Http::withToken(config('services.mercadopago.access_token'))
            ->withHeaders(['X-Idempotency-Key' => 'order-pref-' . $order->code])
            ->post("{$this->baseUrl}/checkout/preferences", [
                'items'                => $items,
                'external_reference'   => $order->code,
                'notification_url'     => route('webhooks.mercadopago'),
                'statement_descriptor' => mb_substr((string) config('app.name', 'zLuz'), 0, 22),
                'payer' => [
                    'name'    => $order->customer_name,
                    'email'   => $order->customer_email,
                    'phone'   => ['number' => preg_replace('/\D/', '', (string) $order->customer_phone)],
                    'address' => [
                        'zip_code'      => preg_replace('/\D/', '', (string) $order->ship_zipcode),
                        'street_name'   => $order->ship_street,
                        'street_number' => $order->ship_number,
                    ],
                ],
                'back_urls' => [
                    'success' => $payUrl,
                    'failure' => $payUrl,
                    'pending' => $payUrl,
                ],
                'auto_return' => 'approved',
                'expires'     => true,
                'expiration_date_to' => $order->expires_at->format('Y-m-d\TH:i:s.vP'),
                'payment_methods' => [
                    'excluded_payment_types' => [
                        ['id' => 'ticket'],
                        ['id' => 'bank_transfer'],
                        ['id' => 'atm'],
                    ],
                    'installments' => 12,
                ],
            ]);

        if ($response->failed()) {
            throw new \RuntimeException('Não foi possível iniciar o pagamento. Tente de novo em instantes.');
        }

        $data = $response->json();
        $sandbox = (bool) config('services.mercadopago.sandbox', false);

        return [
            'provider_id'   => (string) ($data['id'] ?? ('pref-' . $order->code)),
            'status'        => 'pending',
            'pix_payload'   => null,
            'pix_qr_base64' => null,
            'checkout_url'  => $sandbox
                ? ($data['sandbox_init_point'] ?? $data['init_point'] ?? null)
                : ($data['init_point'] ?? $data['sandbox_init_point'] ?? null),
            'ticket_url'    => null,
            'barcode'       => null,
            'raw'           => $data,
        ];
    }

    public function fetchPayment(string $providerId): array
    {
        if ($this->isFake()) {
            if (str_starts_with($providerId, 'local-')) {
                return ['id' => $providerId, 'status' => 'approved', 'external_reference' => null];
            }

            return ['id' => $providerId, 'status' => 'pending'];
        }

        $response = Http::withToken(config('services.mercadopago.access_token'))
            ->get("{$this->baseUrl}/v1/payments/{$providerId}");

        if ($response->failed()) {
            throw new \RuntimeException('Falha ao consultar pagamento no MP.');
        }

        return $response->json();
    }

    public function fetchMerchantOrder(string $orderId): array
    {
        if ($this->isFake()) {
            return ['id' => $orderId, 'payments' => [], 'external_reference' => null];
        }

        $response = Http::withToken(config('services.mercadopago.access_token'))
            ->get("{$this->baseUrl}/merchant_orders/{$orderId}");

        if ($response->failed()) {
            throw new \RuntimeException('Falha ao consultar merchant order no MP.');
        }

        return $response->json();
    }

    private function payer(Order $order): array
    {
        return [
            'email'      => $order->customer_email,
            'first_name' => Str::before($order->customer_name, ' '),
            'last_name'  => Str::after($order->customer_name, ' ') ?: $order->customer_name,
        ];
    }
}
