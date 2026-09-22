<?php

namespace App\Services\Correios;

use App\Models\Cart;
use Illuminate\Support\Facades\Log;
use RuntimeException;

class CorreiosShippingService
{
    public function __construct(private CorreiosCwsClient $client) {}

    public function configured(): bool
    {
        return $this->client->configured() && $this->services()->isNotEmpty();
    }

    public function calculateForCart(Cart $cart, string $cep): array
    {
        if (! $this->configured()) {
            throw new RuntimeException('Correios CWS não configurado.');
        }

        $cepDestino = preg_replace('/\D/', '', $cep) ?? '';
        $cepOrigem = preg_replace('/\D/', '', (string) config('services.correios.from_cep', '15014090')) ?? '';

        if (strlen($cepDestino) !== 8 || strlen($cepOrigem) !== 8) {
            throw new RuntimeException('CEP inválido para cotação.');
        }

        $package = $this->packageFromCart($cart);
        $services = $this->services();

        $precoBody = [
            'idLote' => now()->format('His'),
            'parametrosProduto' => $services->values()->map(function (array $service, int $index) use ($cepOrigem, $cepDestino, $package) {
                $row = [
                    'coProduto' => $service['code'],
                    'nuRequisicao' => (string) ($index + 1),
                    'cepOrigem' => $cepOrigem,
                    'cepDestino' => $cepDestino,
                    'psObjeto' => (string) $package['weight_g'],
                    'tpObjeto' => '2',
                    'comprimento' => (string) $package['length'],
                    'largura' => (string) $package['width'],
                    'altura' => (string) $package['height'],
                    'vlDeclarado' => '0',
                ];

                if ($this->client->credential('services.correios.contrato') !== '') {
                    $row['nuContrato'] = $this->client->credential('services.correios.contrato');
                }

                if ($this->client->credential('services.correios.dr') !== '') {
                    $row['nuDR'] = $this->client->credential('services.correios.dr');
                }

                return $row;
            })->all(),
        ];

        $prazoBody = [
            'idLote' => now()->format('His'),
            'parametrosPrazo' => $services->values()->map(fn(array $service, int $index) => [
                'coProduto' => $service['code'],
                'nuRequisicao' => (string) ($index + 1),
                'cepOrigem' => $cepOrigem,
                'cepDestino' => $cepDestino,
                'dtEvento' => now()->format('d-m-Y'),
            ])->all(),
        ];

        $precoResponse = $this->client->post('/preco/v1/nacional', $precoBody);
        $prazoResponse = $this->client->post('/prazo/v1/nacional', $prazoBody);

        if ($precoResponse->failed()) {
            Log::warning('Correios CWS preço falhou', ['status' => $precoResponse->status()]);

            throw new RuntimeException('Não foi possível calcular o frete.');
        }

        $prazos = collect($prazoResponse->successful() ? $prazoResponse->json() : [])
            ->filter(fn($row) => is_array($row) && filled($row['coProduto'] ?? null))
            ->keyBy(fn($row) => (string) $row['coProduto']);

        $names = $services->keyBy('code');

        return collect($precoResponse->json())
            ->filter(fn($row) => is_array($row) && filled($row['coProduto'] ?? null) && empty($row['txErro'] ?? null))
            ->map(function (array $row) use ($prazos, $names) {
                $code = (string) $row['coProduto'];
                $prazo = $prazos->get($code, []);
                $price = $this->parseReais($row['pcFinal'] ?? $row['pcBase'] ?? 0);

                return [
                    'id' => $code,
                    'name' => $names[$code]['name'] ?? $code,
                    'price' => $price,
                    'delivery_time' => isset($prazo['prazoEntrega']) ? (int) $prazo['prazoEntrega'] : null,
                    'company' => ['picture' => null],
                    'has_error' => false,
                ];
            })
            ->filter(fn(array $opt) => $opt['price'] >= 0)
            ->values()
            ->all();
    }

    private function services()
    {
        return collect(config('services.correios.services', []))
            ->filter(function ($service) {
                if (! is_array($service) || ! filled($service['code'] ?? null)) {
                    return false;
                }
                $code = trim((string) $service['code']);

                return $code !== '' && preg_match('/^\d{5}$/', $code) === 1;
            })
            ->map(fn(array $service) => [
                'code'  =>  (string) $service['code'],
                'name'  =>  (string) ($service['name'] ?: $service['code']),
            ])
            ->unique('code')
            ->values();
    }

    private function packageFromCart(Cart $cart): array
    {
        $weight = 0.0;
        $height = 0.0;
        $width = 0.0;
        $length = 0.0;

        foreach ($cart->items as $item) {
            $qty = (int) ($item->quantity ?? 1);
            $variant = $item->variant ?? null;

            $weight += (float) ($variant->weight_kg ?? 0.3) * $qty;
            $height += (float) ($variant->height_cm ?? 5) * $qty;
            $width = max($width, (float) ($variant->width_cm ?? 16));
            $length = max($length, (float) ($variant->length_cm ?? 20));
        }

        return [
            'weight_g'  =>  max(100, (int) round(max($weight, 0.1) * 1000)),
            'height'    => (int) max($height, 2),
            'width'     =>  (int) max($width, 11),
            'length'    =>  (int) max($length, 16),
        ];
    }

    private function parseReais(mixed $value): float
    {
        if(is_int($value) || is_float($value)) {
            return (float) $value;
        }

        $raw = trim((string) $value);

        if($raw === '') {
            return 0.0;
        }

        if(str_contains($raw, ',') && str_contains($raw, '.')){
            $raw = str_replace('.', '', $raw);
            $raw = str_replace(',', '.', $raw);
        } else {
            $raw = str_replace(',', '.', $raw);
        }

        return (float) $raw;
    }
}
