<?php

namespace App\Services;

use App\Models\Cart;
use App\Models\ProductVariant;
use Illuminate\Support\Facades\Auth;

class CartService
{
    public function current(): Cart
    {
        if (Auth::check()) {
            return Cart::firstOrCreate(['user_id' => Auth::id()]);
        }
        return Cart::firstOrCreate(['session_id' => session()->getId()]);
    }

    public function load(): Cart
    {
        return $this->current()->load('items.variant.product');
    }

    public function add(int $variantId, int $qty = 1): Cart
    {
        $variant = ProductVariant::findOrFail($variantId);
        $cart = $this->current();

        $item = $cart->items()->firstOrNew(['product_variant_id' => $variant->id]);
        $newQty = ($item->quantity ?? 0) + $qty;

        abort_if($newQty > $variant->stock, 422, "Estoque insuficiente. Disponível:{$variant->stock}");

        $item->quantity = $newQty;
        $item->save();

        return $this->load();
    }

    private function recalculateCart(Cart $cart): void
    {
        // Se o carrinho ficou vazio, zera tudo
        if ($cart->items->isEmpty()) {
            $cart->update([
                'coupon_id' => null,
                'coupon_code' => null,
                'discount_cents' => 0,
                'shipping_cents' => null,
                'shipping_service' => null,
            ]);
            return;
        }

        // Recalcula o desconto se houver cupom aplicado
        if ($cart->coupon) {
            $subtotalCents = (int) round($cart->subtotalCents());
            $coupon = $cart->coupon;

            $discountCents = 0;

            if ($coupon->tipo === 'percentual') {
                $discountCents = (int) round($subtotalCents * ($coupon->valor / 100));
            } else {
                // Fixo
                $discountCents = (int) round($coupon->valor * 100);
            }

            // O desconto não pode ser maior que o subtotal
            $discountCents = min($discountCents, $subtotalCents);

            $cart->update([
                'discount_cents' => $discountCents,
            ]);
        }
    }

    public function updateQty(int $itemId, int $qty): Cart
    {
        $cart = $this->load();
        $item = $cart->items()->where('id', $itemId)->firstOrFail();

        if ($qty <= 0) {
            $item->delete();
        } else {
            $item->update(['quantity' => $qty]);
        }

        // Recarrega as relações para recalcular os totais atualizados
        $cart = $cart->fresh(['items.variant.product', 'coupon']);

        // Recalcula cupom e limpa frete se o carrinho mudar
        $this->recalculateCart($cart);

        return $cart->fresh(['items.variant.product', 'coupon']);
    }

    public function remove(int $itemId): Cart
    {
        $this->current()->items()->where('id', $itemId)->delete();
        return $this->load();
    }

    public function clear(): void
    {
        $this->current()->items()->delete();
    }

    // Chame no login para não perder o carrinho do visitante
    public function mergeGuestCart(int $userId, ?string $sessionId = null): void
    {
        $guest = Cart::where('session_id', $sessionId ?? session()->getId())
            ->with('items.variant')
            ->first();

        if (! $guest) {
            return;
        }

        $userCart = Cart::firstOrCreate(['user_id' => $userId]);

        foreach ($guest->items as $item) {
            $existing = $userCart->items()->firstOrNew(['product_variant_id' => $item->product_variant_id]);
            $somado = ($existing->quantity ?? 0) + $item->quantity;

            // não deixa o merge estourar o estoque
            $existing->quantity = min($somado, $item->variant->stock);
            $existing->save();
        }

        $guest->delete();
    }
}
