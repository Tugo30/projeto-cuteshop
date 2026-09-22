<?php

namespace App\Services;

use App\Models\Order;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use RuntimeException;

class GetnetService
{
    public function baseUrl(): string
    {
        return config('services.getnet.sandbox')
            ? 'https://api-homologacao.getnet.com.br'
            : 'https://api.getnet.com.br';
    }

    private function isFake(): bool
    {
        $fake = (bool) config('services.getnet.fake', false);

        if ($fake && app()->environment('production')) {
            throw new RuntimeException('GETNET_FAKE nao pode ser usado em producao.');
        }

        return $fake;
    }

    private function sellerId(): string
    {
        $id = (string) config('services.getnet.seller_id');

        if ($id === '') {
            throw new RuntimeException('GETNET_SELLER_ID ausente.');
        }

        return $id;
    }

    private function accessToken(): string
    {
        return Cache::remember('getnet.access_token', 50 * 60, function () {
            $id = config('services.getnet.client_id');
            $secret = config('services.getnet.client_secret');

            if (! $id || ! $secret) {
                throw new RuntimeException('Credenciais Getnet ausentes.');
            }

            $response = Http::asForm()
                ->timeout(15)
                ->withBasicAuth($id, $secret)
                ->post($this->baseUrl().'/auth/oauth/v2/token', [
                    'scope'      => 'oob',
                    'grant_type' => 'client_credentials',
                ]);

            $token = $response->json('access_token');

            if ($response->failed() || empty($token)) {
                Log::error('Getnet OAuth falhou', ['status' => $response->status()]);
                throw new RuntimeException('Nao foi possivel autenticar na Getnet.');
            }

            return (string) $token;
        });
    }

    private function http(): PendingRequest
    {
        return Http::timeout(20)
            ->retry(2, 250)
            ->withToken($this->accessToken())
            ->acceptJson()
            ->asJson();
    }

    public function createPixPayment(Order $order): array
    {
        if ($this->isFake()) {
            return [
                'provider_id'   => 'local-pix-'.$order->code,
                'status'        => 'pending',
                'pix_payload'   => '00020126580014BR.GOV.BCB.PIX0136123e4567-e89b-12d3-a456-42661417400052040000530398654041.005802BR5913TestStore6008SAO PAULO62070503***6304E2CA',
                'pix_qr_base64' => null,
                'checkout_url'  => null,
                'ticket_url'    => null,
                'barcode'       => null,
                'raw'           => ['fake' => true, 'method' => 'pix'],
            ];
        }

        $response = $this->http()
            ->withHeaders(['seller_id' => $this->sellerId()])
            ->post($this->baseUrl().'/v1/payments/qrcode/pix', [
                'amount'      => (int) $order->total_cents,
                'currency'    => 'BRL',
                'order_id'    => $order->code,
                'customer_id' => 'user-'.$order->user_id,
            ]);

        if ($response->failed()) {
            Log::error('Getnet PIX falhou', ['status' => $response->status(), 'order' => $order->code]);
            throw new RuntimeException('Nao foi possivel iniciar o Pix. Tente de novo em instantes.');
        }

        $data = $response->json();
        $extra = $data['additional_data'] ?? [];

        return [
            'provider_id'   => (string) ($data['payment_id'] ?? ''),
            'status'        => 'pending',
            'pix_payload'   => $extra['qr_code'] ?? $extra['pix_code'] ?? null,
            'pix_qr_base64' => $extra['qr_code_base64'] ?? null,
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
                'provider_id'   => 'local-boleto-'.$order->code,
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
        $names = $this->splitName($order->customer_name);

        $payload = [
            'seller_id' => $this->sellerId(),
            'amount'    => (int) $order->total_cents,
            'currency'  => 'BRL',
            'order'     => [
                'order_id'     => $order->code,
                'product_type' => 'physical_goods',
            ],
            'boleto' => [
                'document_number' => substr($order->code, 0, 15),
                'instructions'    => 'Nao receber apos o vencimento.',
                'provider'        => 'santander',
                'expiration_date' => $order->expires_at?->timezone(config('app.timezone'))->format('d/m/Y')
                    ?? now()->addHours((int) config('pix.boleto_expires_hours', 72))->format('d/m/Y'),
            ],
            'customer' => [
                'first_name'      => $names[0],
                'last_name'       => $names[1],
                'name'            => $order->customer_name,
                'email'           => $order->customer_email,
                'document_type'   => strlen($document) === 14 ? 'CNPJ' : 'CPF',
                'document_number' => $document,
                'phone_number'    => preg_replace('/\D/', '', (string) $order->customer_phone),
                'billing_address' => $this->address($order),
            ],
        ];

        $response = $this->http()->post($this->baseUrl().'/v1/payments/boleto', $payload);

        if ($response->failed()) {
            Log::error('Getnet boleto falhou', ['status' => $response->status(), 'order' => $order->code]);
            throw new RuntimeException('Nao foi possivel gerar o boleto. Tente de novo em instantes.');
        }

        $data = $response->json();

        return [
            'provider_id'   => (string) ($data['payment_id'] ?? ''),
            'status'        => 'pending',
            'pix_payload'   => null,
            'pix_qr_base64' => null,
            'checkout_url'  => null,
            'ticket_url'    => data_get($data, 'boleto._links.pdf.href')
                ?? data_get($data, 'boleto.pdf')
                ?? null,
            'barcode'       => data_get($data, 'boleto.barcode')
                ?? data_get($data, 'boleto.typeful_line'),
            'raw'           => $data,
        ];
    }

    public function chargeCard(Order $order, array $tokenized): array
    {
        if ($this->isFake()) {
            return [
                'provider_id' => 'local-card-'.$order->code,
                'status'      => 'approved',
                'amount'      => (int) $order->total_cents,
                'raw'         => ['fake' => true, 'method' => 'credit_card'],
            ];
        }

        $document = preg_replace('/\D/', '', (string) $order->customer_document);
        $names = $this->splitName($order->customer_name);

        $payload = [
            'seller_id' => $this->sellerId(),
            'amount'    => (int) $order->total_cents,
            'currency'  => 'BRL',
            'order'     => [
                'order_id'     => $order->code,
                'product_type' => 'physical_goods',
            ],
            'customer' => [
                'customer_id'     => 'user-'.$order->user_id,
                'first_name'      => $names[0],
                'last_name'       => $names[1],
                'name'            => $order->customer_name,
                'email'           => $order->customer_email,
                'document_type'   => strlen($document) === 14 ? 'CNPJ' : 'CPF',
                'document_number' => $document,
                'phone_number'    => preg_replace('/\D/', '', (string) $order->customer_phone),
                'billing_address' => $this->address($order),
            ],
            'credit' => [
                'delayed'             => false,
                'pre_authorization'   => false,
                'save_card_data'      => false,
                'transaction_type'    => 'FULL',
                'number_installments' => 1,
                'card'                => [
                    'number_token'     => $tokenized['number_token'],
                    'cardholder_name'  => $tokenized['cardholder_name'],
                    'expiration_month' => $tokenized['expiration_month'],
                    'expiration_year'  => $tokenized['expiration_year'],
                ],
            ],
        ];

        $response = $this->http()
            ->withHeaders(['Idempotency-Key' => 'card-'.$order->code])
            ->post($this->baseUrl().'/v1/payments/credit', $payload);

        if ($response->failed()) {
            Log::error('Getnet cartao falhou', ['status' => $response->status(), 'order' => $order->code]);
            throw new RuntimeException('Nao foi possivel processar o cartao.');
        }

        $data = $response->json();

        return [
            'provider_id' => (string) ($data['payment_id'] ?? ''),
            'status'      => strtolower((string) ($data['status'] ?? '')),
            'amount'      => (int) ($data['amount'] ?? 0),
            'raw'         => $data,
        ];
    }

    public function fetchPayment(string $paymentId, string $kind = 'auto'): array
    {
        if ($this->isFake()) {
            if (str_starts_with($paymentId, 'local-')) {
                return [
                    'payment_id' => $paymentId,
                    'id'         => $paymentId,
                    'status'     => 'APPROVED',
                    'amount'     => null,
                    'order_id'   => null,
                ];
            }

            return ['payment_id' => $paymentId, 'id' => $paymentId, 'status' => 'WAITING'];
        }

        $paths = match ($kind) {
            'pix'    => [
                '/v1/payments/qrcode/pix/'.$paymentId,
                '/v1/payments/qrcode/'.$paymentId,
            ],
            'boleto' => ['/v1/payments/boleto/'.$paymentId],
            'credit' => ['/v1/payments/credit/'.$paymentId],
            default  => [
                '/v1/payments/qrcode/pix/'.$paymentId,
                '/v1/payments/qrcode/'.$paymentId,
                '/v1/payments/boleto/'.$paymentId,
                '/v1/payments/credit/'.$paymentId,
            ],
        };

        foreach ($paths as $path) {
            $response = $this->http()
                ->withHeaders(['seller_id' => $this->sellerId()])
                ->get($this->baseUrl().$path);

            if ($response->successful()) {
                $data = $response->json();
                $data['id'] = $data['payment_id'] ?? $data['id'] ?? $paymentId;

                return $data;
            }
        }

        throw new RuntimeException('Falha ao consultar pagamento na Getnet.');
    }

    public function isApproved(array $data): bool
    {
        $status = strtoupper((string) ($data['status'] ?? ''));

        return in_array($status, ['APPROVED', 'PAID', 'CONFIRMED', 'AUTHORIZED'], true);
    }

    private function address(Order $order): array
    {
        return [
            'street'      => (string) $order->ship_street,
            'number'      => (string) $order->ship_number,
            'complement'  => (string) ($order->ship_complement ?: 'N/A'),
            'district'    => (string) $order->ship_district,
            'city'        => (string) $order->ship_city,
            'state'       => (string) $order->ship_state,
            'country'     => 'Brasil',
            'postal_code' => preg_replace('/\D/', '', (string) $order->ship_zipcode),
        ];
    }

    private function splitName(string $name): array
    {
        $first = Str::before(trim($name), ' ');
        $last = trim(Str::after(trim($name), ' ')) ?: $first;

        return [$first, $last];
    }
}
