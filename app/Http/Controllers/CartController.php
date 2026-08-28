<?php

namespace App\Http\Controllers;

use App\Models\Coupon;
use App\Services\CartService;
use App\Services\SuperFreteService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class CartController extends Controller
{
    public function __construct(
        private CartService $cart,
        private SuperFreteService $superFrete,
    ) {}

    public function index()
    {
        return response()->json($this->present($this->cart->load()));
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'product_variant_id' => 'required|exists:product_variants,id',
            'quantity'           => 'nullable|integer|min:1|max:99',
        ]);

        $cart = $this->cart->add($data['product_variant_id'], $data['quantity'] ?? 1);

        return response()->json($this->present($cart));
    }

    public function update(Request $request, int $itemId)
    {
        $data = $request->validate(['quantity' => 'required|integer|min:0|max:99']);

        return response()->json($this->present($this->cart->updateQty($itemId, $data['quantity'])));
    }

    public function destroy(int $itemId)
    {
        return response()->json($this->present($this->cart->remove($itemId)));
    }

    public function page()
    {
        return view('cart.cart');
    }

    public function calculateShipping(Request $request)
    {
        $data = $request->validate([
            'cep' => 'required|string|min:8|max:9'
        ]);

        // Sanitiza o CEP (deixa apenas números)
        $cleanCep = preg_replace('/\D/', '', $data['cep']);

        $cart = $this->cart->load();

        if ($cart->items->isEmpty()) {
            return response()->json(['message' => 'Carrinho vazio.'], 422);
        }

        try {
            $result = $this->superFrete->cheapestForCart($cart, $cleanCep);
            Log::info('Resultado SuperFrete:', (array) $result);
        } catch (\Exception $e) {
            Log::error('Erro ao calcular frete: ' . $e->getMessage());
            return response()->json(['message' => 'Não foi possível calcular o frete: ' . $e->getMessage()], 422);
        }

        // Extrai o valor do frete sem permitir que caia silenciosamente para 0
        $cents = 0;
        if (isset($result['cents']) && $result['cents'] > 0) {
            $cents = (int) $result['cents'];
        } elseif (isset($result['price']) && (float)$result['price'] > 0) {
            $cents = (int) round(((float) $result['price']) * 100);
        } elseif (is_numeric($result) && (float)$result > 0) {
            $cents = (int) round(((float) $result) * 100);
        }

        // Se o cálculo não retornar valor válido maior que zero, interrompe com erro
        if ($cents <= 0) {
            return response()->json([
                'message' => 'Não foi possível obter um valor de frete válido para este CEP.'
            ], 422);
        }

        // Salva o CEP sanitizado e as informações do frete no carrinho
        $cart->update([
            'shipping_cep'     => $cleanCep,
            'shipping_cents'   => $cents,
            'shipping_service' => $result['service'] ?? $result['name'] ?? 'SuperFrete',
        ]);

        return response()->json($this->present($cart->fresh()->load('items.variant.product')));
    }

    public function applyCoupon(Request $request)
    {
        $data = $request->validate(['codigo' => 'required|string|max:50']);
        $cart = $this->cart->load();

        if ($cart->items->isEmpty()) {
            return response()->json(['message' => 'Carrinho vazio.'], 422);
        }

        $coupon = Coupon::where('codigo', $data['codigo'])
            ->where('active', true)
            ->where(function ($q) {
                $q->whereNull('validade')->orWhere('validade', '>=', now()->toDateString());
            })->first();

        if (! $coupon) {
            return response()->json(['message' => 'Cupom inválido ou expirado.'], 422);
        }

        $subtotalCents = (int) round($this->getSubtotalInReais($cart) * 100);

        $discount = $coupon->tipo === 'percentual'
            ? (int) round($subtotalCents * ($coupon->valor / 100))
            : (int) round($coupon->valor * 100);

        $discount = min($discount, $subtotalCents);

        $cart->update([
            'coupon_id'      => $coupon->id,
            'discount_cents' => $discount,
        ]);

        return response()->json($this->present($cart->fresh()->load('items.variant.product')));
    }

    public function removeCoupon()
    {
        $cart = $this->cart->load();
        $cart->update(['coupon_id' => null, 'discount_cents' => 0]);

        return response()->json($this->present($cart->fresh()->load('items.variant.product')));
    }

    private function getSubtotalInReais($cart): float
    {
        return (float) $cart->items->sum(function ($i) {
            return ((float) ($i->variant->price ?? 0)) * $i->quantity;
        });
    }

    private function present($cart): array
    {
        $items = $cart->items->map(function ($i) {
            $price = (float) ($i->variant->price ?? 0);
            return [
                'id'                 => $i->id,
                'variant_id'         => $i->product_variant_id ?? $i->variant_id,
                'product_variant_id' => $i->product_variant_id ?? $i->variant_id,
                'name'               => $i->variant->product->name ?? 'Produto',
                'size'               => $i->variant->size ?? null,
                'image'              => $i->variant->product->image ?? $i->variant->product->cover_url ?? null,
                'unit_price'         => $price,
                'quantity'           => (int) $i->quantity,
                'stock'              => (int) ($i->variant->stock ?? 0),
                'line_total'         => $price * $i->quantity,
            ];
        });

        $subtotal = $items->sum('line_total');
        $subtotalCents = (int) round($subtotal * 100);

        $shippingCents = (int) ($cart->shipping_cents ?? 0);
        $shipping = $shippingCents / 100;

        $discountCents = (int) ($cart->discount_cents ?? 0);
        $discount = $discountCents / 100;

        $totalCents = max(0, $subtotalCents - $discountCents + $shippingCents);
        $total = $totalCents / 100;

        return [
            'id'               => $cart->id,
            'coupon_code'      => $cart->coupon->codigo ?? $cart->coupon_code ?? null,
            'discount'         => $discount,
            'discount_cents'   => $discountCents,
            'shipping'         => $shipping,
            'shipping_cents'   => $shippingCents,
            'shipping_service' => $cart->shipping_service,
            'shipping_cep'     => $cart->shipping_cep, // Retorna o CEP salvo para o React
            'subtotal'         => $subtotal,
            'subtotal_cents'   => $subtotalCents,
            'total'            => $total,
            'total_cents'      => $totalCents,
            'items'            => $items->values()->toArray(),
        ];
    }
}