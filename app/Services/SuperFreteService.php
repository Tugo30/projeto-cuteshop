<?php

namespace App\Services;

use App\Models\Cart;
use Illuminate\Support\Facades\Http;

class SuperFreteService
{
    private function baseUrl(): string
    {
        return config('services.superfrete.sandbox', true)
            ? 'https://sandbox.superfrete.com/api/v0'
            : 'https://api.superfrete.com/api/v0';
    }

    /**
     * Consulta a API do SuperFrete no Sandbox/Produção
     */
    public function calculateForCart(Cart $cart, string $cep): array
    {
        $token = config('services.superfrete.token');

        if (!$token) {
            throw new \RuntimeException('Token do SuperFrete não configurado.');
        }

        $cepLimpo = preg_replace('/\D/', '', $cep);
        $fromCep = preg_replace('/\D/', '', config('services.superfrete.from_cep', '15014090'));

        // 1. CÁLCULO DAS DIMENSÕES E PESO
        $weight = 0;
        $height = 0;
        $width  = 0;
        $length = 0;

        foreach ($cart->items as $item) {
            $qty = (int) ($item->quantity ?? 1);
            $variant = $item->variant;

            // Pega o peso/dimensões da variante ou usa dimensões padrão
            $vWeight = (float) ($variant->weight_kg ?? 0.3);
            $vHeight = (float) ($variant->height_cm ?? 5);
            $vWidth  = (float) ($variant->width_cm  ?? 16);
            $vLength = (float) ($variant->length_cm ?? 20);

            $weight += $vWeight * $qty;
            $height += $vHeight * $qty;
            $width   = max($width, $vWidth);
            $length  = max($length, $vLength);
        }

        // 2. APLICAÇÃO DOS MÍNIMOS DA API/CORREIOS
        $package = [
            'weight' => max($weight, 0.1),
            'height' => max($height, 2),
            'width'  => max($width, 11),
            'length' => max($length, 16),
        ];

        // 3. REQUISIÇÃO JSON PARA O ENDPOINT DA SUPERFRETE
        $response = Http::asJson()
            ->withToken($token)
            ->withHeaders([
                'User-Agent' => config('app.name', 'Cutshop') . ' (' . config('services.superfrete.email', 'cutshopbrasil@gmail.com') . ')',
                'Accept'     => 'application/json',
            ])
            ->post($this->baseUrl() . '/calculator', [
                'from' => [
                    'postal_code' => $fromCep,
                ],
                'to' => [
                    'postal_code' => $cepLimpo,
                ],
                'services' => '1,2,17', // 1: PAC, 2: SEDEX, 17: Mini Envios
                'package'  => $package,
            ]);

        if ($response->failed()) {
            throw new \RuntimeException('Falha no Sandbox SuperFrete: ' . $response->body());
        }

        return $response->json();
    }
}
