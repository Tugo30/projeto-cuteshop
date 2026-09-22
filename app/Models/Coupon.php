<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Coupon extends Model
{
    protected $fillable = [
        'codigo',
        'tipo',
        'valor',
        'validade',
        'active',
        'user_id',
        'max_uses',
        'max_uses_per_user',
    ];

    protected $casts = [
        'active'            => 'boolean',
        'valor'             => 'float',
        'validade'          => 'date',
        'max_uses'          => 'integer',
        'max_uses_per_user' => 'integer',
    ];

    public function orders()
    {
        return $this->hasMany(Order::class);
    }

    public function owner()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function usageQuery()
    {
        return $this->orders()->whereNotIn('status', ['canceled', 'expired']);
    }

    public function isUsableBy(?int $userId): ?string
    {
        if (! $this->active) {
            return 'Cupom inativo.';
        }

        if ($this->validade && $this->validade->lt(now()->startOfDay())) {
            return 'Cupom expirado.';
        }

        if ($this->max_uses !== null && $this->usageQuery()->count() >= $this->max_uses) {
            return 'Este cupom esgotou.';
        }

        if ($userId && $this->max_uses_per_user) {
            $mine = $this->usageQuery()->where('user_id', $userId)->count();
            if ($mine >= $this->max_uses_per_user) {
                return 'Você já usou este cupom.';
            }
        }

        return null;
    }
}
