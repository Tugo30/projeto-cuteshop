<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Payment extends Model
{
    protected $fillable = [
        'order_id', 'method', 'status', 'provider_status', 'amount_cents', 'txid',
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

    public function checkoutUrl(): ?string
    {
        $raw = $this->provider_response ?? [];

        return $raw['init_point']
            ?? $raw['sandbox_init_point']
            ?? $raw['checkout_url']
            ?? null;
    }

    public function ticketUrl(): ?string
    {
        $raw = $this->provider_response ?? [];

        return data_get($raw, 'transaction_details.external_resource_url')
            ?? data_get($raw, 'point_of_interaction.transaction_data.ticket_url')
            ?? ($raw['ticket_url'] ?? null);
    }

    public function barcode(): ?string
    {
        $raw = $this->provider_response ?? [];
        $code = data_get($raw, 'barcode.content')
            ?? data_get($raw, 'transaction_details.barcode.content')
            ?? ($raw['barcode'] ?? null);

        return is_string($code) || is_numeric($code) ? (string) $code : null;
    }
}
