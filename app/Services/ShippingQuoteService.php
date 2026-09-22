<?php

namespace App\Services;

use App\Models\Cart;
use App\Services\Correios\CorreiosShippingService;
use Illuminate\Support\Facades\Log;
use RuntimeException;
use Throwable;

class ShippingQuoteService
{
    public function __construct(
        private CorreiosShippingService $correios,
        private SuperFreteService $superFrete,
    ) {}

    public function calculateForCart(Cart $cart, string $cep): array
    {
        if ($this->correios->configured()) {
            try {
                return $this->correios->calculateForCart($cart, $cep);
            } catch (Throwable $e) {
                // Correios configurado mas indisponível agora (token, API fora
                // do ar, timeout, etc.) — loga e tenta o SuperFrete abaixo em
                // vez de quebrar o checkout do cliente.
                Log::warning('Correios CWS indisponível, caindo para SuperFrete', [
                    'exception' => $e->getMessage(),
                ]);
            }
        }

        if (filled(config('services.superfrete.token'))) {
            return $this->superFrete->calculateForCart($cart, $cep);
        }

        throw new RuntimeException('Frete não configurado.');
    }
}