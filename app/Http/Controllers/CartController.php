<?php

namespace App\Http\Controllers;

use App\Http\Requests\Cart\ApplyCouponRequest;
use App\Http\Requests\Cart\CalculateShippingRequest;
use App\Http\Requests\Cart\SelectShippingRequest;
use App\Http\Requests\Cart\StoreCartItemRequest;
use App\Http\Requests\Cart\UpdateCartItemRequest;
use App\Models\Coupon;
use App\Models\ProductVariant;
use App\Services\CartService;
use App\Services\ShippingQuoteService;
use Illuminate\Support\Facades\Log;

class CartController extends Controller
{
    public function __construct(
        private CartService $cart,
        private ShippingQuoteService $shipping
    ) {}

    public function index()
    {
        return response()->json($this->present($this->cart->load()));
    }

    public function store(StoreCartItemRequest $request)
    {
        $data = $request->validated();

        $qty = $data['quantity'] ?? 1;
        $variant = ProductVariant::query()->find($data['product_variant_id']);

        if (! $variant || $variant->stock < $qty) {
            return response()->json(['message' => 'Estoque insuficiente.'], 422);
        }

        return response()->json($this->present(
            $this->cart->add($data['product_variant_id'], $qty)
        ));
    }

    public function update(UpdateCartItemRequest $request, int $itemId)
    {
        $data = $request->validated();

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

    public function calculateShipping(CalculateShippingRequest $request)
    {
        $cleanCep = $request->validated()['cep'];
        $cart = $this->cart->load();

        if ($cart->items->isEmpty()) {
            return response()->json(['message' => 'Carrinho vazio.'], 422);
        }

        try {
            $rawOptions = $this->shipping->calculateForCart($cart, $cleanCep);

            $options = collect($rawOptions)
                ->reject(fn ($opt) => ! empty($opt['error']) || ($opt['has_error'] ?? false))
                ->map(function ($opt) {
                    $price = (float) ($opt['price'] ?? 0);

                    return [
                        'id'            => $opt['id'] ?? null,
                        'name'          => $opt['name'] ?? 'Frete',
                        'price'         => $price,
                        'price_cents'   => (int) round($price * 100),
                        'delivery_time' => $opt['delivery_time'] ?? null,
                        'company_logo'  => $opt['company']['picture'] ?? null,
                    ];
                })
                ->filter(fn ($opt) => $opt['id'] !== null && $opt['price_cents'] >= 0)
                ->values();

            if ($options->isEmpty()) {
                return response()->json([
                    'message' => 'Nenhum serviço de entrega disponível para este CEP.',
                ], 422);
            }

            return response()->json([
                'cep'     => $cleanCep,
                'options' => $options,
            ]);
        } catch (\Exception $e) {
            Log::error('Erro ao calcular frete', ['exception' => $e->getMessage()]);

            return response()->json(['message' => 'Não foi possível calcular o frete.'], 422);
        }
    }

    public function selectShipping(SelectShippingRequest $request)
    {
        $data = $request->validated();
        $cleanCep = $data['cep'];
        $cart = $this->cart->load();

        if ($cart->items->isEmpty()) {
            return response()->json(['message' => 'Carrinho vazio.'], 422);
        }

        try {
            $rawOptions = $this->shipping->calculateForCart($cart, $cleanCep);
        } catch (\Exception $e) {
            Log::error('Erro ao validar frete', ['exception' => $e->getMessage()]);

            return response()->json(['message' => 'Não foi possível validar o frete.'], 422);
        }

        $selected = collect($rawOptions)->first(function ($opt) use ($data) {
            if (! empty($opt['error']) || ($opt['has_error'] ?? false)) {
                return false;
            }

            $id = (string) ($opt['id'] ?? '');
            $name = (string) ($opt['name'] ?? '');

            return $id === $data['service'] || $name === $data['service'];
        });

        if (! $selected) {
            return response()->json(['message' => 'Opção de frete inválida para este CEP.'], 422);
        }

        $price = (float) ($selected['price'] ?? 0);

        $cart->update([
            'shipping_cep'     => $cleanCep,
            'shipping_cents'   => (int) round($price * 100),
            'shipping_service' => $selected['name'] ?? $data['service'],
        ]);

        return response()->json($this->present(
            $cart->fresh()->load(['items.variant.product', 'coupon'])
        ));
    }

    public function applyCoupon(ApplyCouponRequest $request)
    {
        $data = $request->validated();

        $cart = $this->cart->load();

        if ($cart->items->isEmpty()) {
            return response()->json(['message' => 'Carrinho vazio.'], 422);
        }

        $coupon = Coupon::query()
            ->where('codigo', $data['codigo'])
            ->where('active', true)
            ->where(function ($q) {
                $q->whereNull('validade')->orWhere('validade', '>=', now()->toDateString());
            })
            ->first();

        if (! $coupon) {
            return response()->json(['message' => 'Cupom inválido ou expirado.'], 422);
        }

        $reason = $coupon->isUsableBy($request->user()?->id);
        if ($reason) {
            return response()->json(['message' => $reason], 422);
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

        return response()->json($this->present(
            $cart->fresh()->load(['items.variant.product', 'coupon'])
        ));
    }

    public function removeCoupon()
    {
        $cart = $this->cart->load();
        $cart->update(['coupon_id' => null, 'discount_cents' => 0]);

        return response()->json($this->present(
            $cart->fresh()->load(['items.variant.product', 'coupon'])
        ));
    }

    private function getSubtotalInReais($cart): float
    {
        return (float) $cart->items->sum(function ($i) {
            return ((float) ($i->variant->price ?? 0)) * $i->quantity;
        });
    }

    private function productImage($product): ?string
    {
        if (! $product) return null;
        $path = $product->coverImage?->path ?? $product->image;
        if (! $path) return $product->image_url ?? null;
        if (str_starts_with($path, 'http') || str_starts_with($path, '/')) return $path;
        return '/storage/' . $path;
    }

    private function present($cart): array
    {
        $cart->loadMissing(['items.variant.product.coverImage', 'coupon']);

        $items = $cart->items->map(function ($i) {
            $product = $i->variant->product ?? null;
            $price = (float) ($i->variant->price ?? 0);

            return [
                'id'                 => $i->id,
                'variant_id'         => $i->product_variant_id ?? $i->variant_id,
                'product_variant_id' => $i->product_variant_id ?? $i->variant_id,
                'name'               => $product->name ?? 'Produto',
                'size'               => $i->variant->size ?? null,
                'image'              => $this->productImage($product),
                'unit_price'         => $price,
                'quantity'           => (int) $i->quantity,
                'stock'              => (int) ($i->variant->stock ?? 0),
                'line_total'         => $price * $i->quantity,
            ];
        });

        $subtotal = $items->sum('line_total');
        $subtotalCents = (int) round($subtotal * 100);

        $hasShipping = $cart->shipping_cents !== null && filled($cart->shipping_service);
        $shippingCents = $hasShipping ? (int) $cart->shipping_cents : null;
        $discountCents = (int) ($cart->discount_cents ?? 0);
        $totalCents = max(0, $subtotalCents - $discountCents + ($shippingCents ?? 0));

        return [
            'id'               => $cart->id,
            'count'            => (int) $items->sum('quantity'),
            'coupon_code'      => $cart->coupon->codigo ?? $cart->coupon_code ?? null,
            'discount'         => $discountCents / 100,
            'discount_cents'   => $discountCents,
            'shipping'         => $hasShipping ? $shippingCents / 100 : null,
            'shipping_cents'   => $shippingCents,
            'shipping_service' => $cart->shipping_service,
            'shipping_cep'     => $cart->shipping_cep,
            'subtotal'         => $subtotal,
            'subtotal_cents'   => $subtotalCents,
            'total'            => $totalCents / 100,
            'total_cents'      => $totalCents,
            'items'            => $items->values()->toArray(),
        ];
    }
}
