<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Payment extends Model
{
    protected $fillable = [
    'order_id', 'method', 'status', 'amount_cents', 'txid',
    'pix_payload', 'pix_qr_base64', 'provider', 'provider_id',
    'provider_response', 'paid_at', 'expires_at',
    ];

    protected $casts = [
        'provider_response' => 'array',
        'paid_at'           => 'datetime',
        'expires_at'        => 'datetime',
    ];

    public function order()
    {
        return $this->belongsTo(Order::class);
    }
}