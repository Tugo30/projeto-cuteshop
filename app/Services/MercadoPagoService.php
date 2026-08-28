<?php

namespace App\Services;

use App\Models\Order;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

class MercadoPagoService
{
    private string $baseUrl = 'https://api.mercadopago.com';

    public function createPixPayment(Order $order): array
    {
        $response = Http::withToken(config('services.mercadopago.access_token'))
            ->withHeaders(['X-Idempotency-Key' => (string) Str::uuid()])
            ->post("{$this->baseUrl}/v1/payments", [
                "transaction_mount" => round($order->total_cents / 100, 2),
                "description" => "Pedido {$order->code}",
                "payment_method" => "pix",
                "external_reference" => $order->code,
                "payer" => [
                    "email" => $order->customer_email,
                    "first_name" => $order->customer_name,
                ],
                "date_of_expiration" => $order->expires_at->toIso8601String(),
                "notification_url" => route("webhooks.mercadopago"),
            ]);

        if ($response->failed()) {
            throw new \RuntimeException('Falha ao criar Pix no Mercado Pago: ' . $response->body());
        }
        $data = $response->json();
        $tx = $data['point_of_interaction']['transaction_data'] ?? [];

        return [
            'provider_id' => (string) $data['id'],
            'status' => $data['status'],
            'pix_payload' => $tx['qr_code'] ?? null,
            'pix_qr_base64' => $tx['qr_code_base64'] ?? null,
            'raw' => $data,
        ];
    }

    public function fetchPayment(string $providerId): array
    {
        $response = Http::withToken(config('services.mercadopago.access_token'))
            ->get("{$this->baseUrl}/v1/payments/{$providerId}");
        if ($response->failed()) {
                throw new \RuntimeException('Falha ao consultar pagamento no MP:' . $response->body());
        }
        return $response->json();
    }
}
