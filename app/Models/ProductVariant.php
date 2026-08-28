<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ProductVariant extends Model
{
    use HasFactory;

    protected $fillable = [
        'product_id',
        'size',
        'stock',
        'cost_price',
        'price',
        'barcode'
    ];

    protected $casts = [
        'stock'      => 'integer',
        'cost_price' => 'decimal:2',
        'price'      => 'decimal:2',
    ];

    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    public function orderItems()
    {
        return $this->hasMany(OrderItem::class, 'product_variant_id');
    }

    public function getPriceCentsAttribute(): int
    {
        return (int) round($this->price * 100);
    }
}
