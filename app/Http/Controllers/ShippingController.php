<?php

namespace App\Http\Controllers;

use App\Http\Requests\QuoteProductShippingRequest;
use App\Models\Cart;
use App\Models\ProductVariant;
use App\Services\ShippingQuoteService;
use Illuminate\Support\Facades\Log;

class ShippingController extends Controller
{
    public function calculate(QuoteProductShippingRequest $request, ShippingQuoteService $shipping)
    {
        $data = $request->validated();
        $variant = ProductVariant::where('product_id', $data['product_id'])->first();

        if(! $variant) {
            return response()->json(['message' => 'Produto sem variante para cortar.'], 422);
        }

        $cart = new Cart;
        $item = new \stdClass;
        $item->quantity = (int) ($data['quantity'] ?? 1);
        $item->variant = $variant;
        $cart->setRelation('items', collect([$item]));

        try{
            $rawOptions = $shipping->calculateForCart($cart, $data['cep']);

            $options = collect($rawOptions)
                ->reject(fn($opt) => ! empty($opt['error']) || ($opt['has_erroro'] ?? false))
                ->map(function($opt) {
                    $price = (float) ($opt['price'] ?? 0);

                    return [
                        'id'    =>  $opt['id'] ?? null,
                        'name'  =>  $opt['name'] ?? $opt['servico'] ?? 'Frete',
                        'price' =>  $price,
                        'price_cents'   =>  (int) round($price * 100),
                        'delivery_time' =>  $opt['delivery_time'] ?? $opt['deadline'] ?? $opt['prazo'] ?? null,
                    ];
                })
                ->filter(fn ($opt) => $opt['id'] !== null && $opt['price_cents'] >= 0)
                ->values();

                if($options->isEmpty()){
                    return response()->json(['message' => 'Nenhum serviço de entrega disponível para este CEP.'], 422);
                }

                return response()->json($options);
        } catch (\Exception $e) {
            Log::error('Erro ao calcular frete do produto', ['exception' => $e->getMessage()]);

            return response()->json(['message'  =>  'Não foi possível calcular o frete.'], 422);
        }
    }
}