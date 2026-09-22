<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class OrderStatusEvent extends Model
{
    protected $fillable = [
        'order_id', 'status', 'stage', 'label', 'source',
        'description', 'payload', 'reference', 'occurred_at'
    ];

    protected $casts = [
        'payload' => 'array',
        'occurred_at' => 'datetime',
    ];

    public function order()
    {
        return $this->belongsTo(Order::class);
    }
}
