<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Cart extends Model
{
    protected $fillable = [
        'user_id',
        'session_id',
        'shipping_cep',
        'shipping_cents',
        'shipping_service',
        'coupon_id',
        'discount_cents'
    ];

    public function coupon()
    {
        return $this->belongsTo(Coupon::class);
    }

    public function items()
    {
        return $this->hasMany(CartItem::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function subtotalCents(): int
    {
        return $this->items->sum(function ($item) {
            $price = $item->variant->price ?? 0;
            $unitPrice = is_numeric($price) && str_contains((string)$price, '.')
                ? (int) round($price * 100)
                : (int) $price;

            return $unitPrice * $item->quantity;
        });
    }

    public function totalCents(): int
    {
        $subtotal = $this->subtotalCents();
        $discount = $this->discount_cents ?? 0;
        $shipping = $this->shipping_cents ?? 0;

        return max(0, $subtotal - $discount + $shipping);
    }
}
