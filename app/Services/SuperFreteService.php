<?php

namespace App\Services;

use App\Models\Cart;
use Illuminate\Support\Facades\Http;

class SuperFreteService
{
    private function baseUrl(): string
    {
        return config('services.superfrete.sandbox')
            ? 'https://sandbox.superfrete.com/api/v0'
            : 'https://api.superfrete.com/api/v0';
    }

    public function cheapestForCart(Cart $cart, string $cep): array
    {
        // Sem token configurado ainda → fallback fixo, só pra não travar o
        // desenvolvimento local. Troca pra API real assim que tiver o token.
        if (! config('services.superfrete.token')) {
            return [
                'service' => 'PAC (simulado — sem token SuperFrete)',
                'cents'   => 1990,
            ];
        }

        $cepLimpo = preg_replace('/\D/', '', $cep);

        $products = $cart->items->map(fn ($i) => [
            'id'              => (string) $i->product_variant_id,
            'width'           => $i->variant->width_cm,
            'height'          => $i->variant->height_cm,
            'length'          => $i->variant->length_cm,
            'weight'          => $i->variant->weight_kg,
            'quantity'        => $i->quantity,
            'insurance_value' => (float) $i->variant->price,
        ])->values()->all();

        $response = Http::withToken(config('services.superfrete.token'))
            ->withHeaders(['User-Agent' => config('app.name') . ' (' . config('mail.from.address') . ')'])
            ->post($this->baseUrl() . '/calculator', [
                'from'     => ['postal_code' => config('services.superfrete.from_cep')],
                'to'       => ['postal_code' => $cepLimpo],
                'products' => $products,
            ]);

        if ($response->failed()) {
            throw new \RuntimeException('Falha ao calcular frete: ' . $response->body());
        }

        $options = collect($response->json())->filter(fn ($o) => ! isset($o['error']));

        if ($options->isEmpty()) {
            throw new \RuntimeException('Nenhuma opção de frete disponível para esse CEP.');
        }

        $cheapest = $options->sortBy(fn ($o) => (float) $o['price'])->first();

        return [
            'service' => $cheapest['name'],
            'cents'   => (int) round(((float) $cheapest['price']) * 100),
        ];
    }
}