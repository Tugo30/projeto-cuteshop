<?php

namespace App\Models;

use Illuminate\Support\Str;
use Illuminate\Database\Eloquent\Model;

class Order extends Model
{
    protected $fillable = [
        'code',
        'user_id',
        'status',
        'coupon_id',
        'subtotal_cents',
        'shipping_cents',
        'discount_cents',
        'total_cents',
        'customer_name',
        'customer_email',
        'customer_phone',
        'customer_document',
        'ship_zipcode',
        'ship_street',
        'ship_number',
        'ship_complement',
        'ship_district',
        'ship_city',
        'ship_state',
        'paid_at',
        'expires_at',
        'tracking_code',
        'shipped_at',
    ];

    protected $casts = [
        'paid_at' => 'datetime',
        'expires_at' => 'datetime',
        'shipped_at' => 'datetime',
    ];

    protected $appends = ['total'];

    public function items()
    {
        return $this->hasMany(OrderItem::class);
    }

    public function payments()
    {
        return $this->hasMany(Payment::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function payment()
    {
        return $this->hasOne(Payment::class)->latestOfMany();
    }

    public function isExpired(): bool
    {
        return $this->status === 'pending'
            && $this->expires_at
            && $this->expires_at->isPast();
    }

    public static function generateCode(): string
    {
        return 'CS-' . now()->format('YmdHis') . '-' . strtoupper(Str::random(12));
    }   
}
