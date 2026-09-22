<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class StockMovement extends Model
{
    public const TYPE_ENTRADA       =   'entrada';
    public const TYPE_SAIDA         =   'saida';
    public const TYPE_AJUSTE        =   'ajuste';
    public const TYPE_VENDA         =   'venda';
    public const TYPE_CANCELAMENTO  =   'cancelamento';
    public const TYPE_DEVOLUCAO     =   'devolucao';

    public const TYPES = [
        self::TYPE_ENTRADA,
        self::TYPE_SAIDA,
        self::TYPE_AJUSTE,
        self::TYPE_VENDA,
        self::TYPE_CANCELAMENTO,
        self::TYPE_DEVOLUCAO,
    ];

    protected $fillable = [
        'product_id',
        'product_variant_id',
        'type',
        'quantity',
        'stock_before',
        'stock_after',
        'reason',
        'user_id',
        'reference_type',
        'reference_id',
    ];

    protected $casts = [
        'quantity'      =>  'integer',
        'stock_before'  =>  'integer',
        'stock_after'   =>  'integer',
    ];

    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    public function variant()
    {
        return $this->belongsTo(ProductVariant::class, 'product_variant_id');
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function reference()
    {
        return $this->morphTo();
    }
}
