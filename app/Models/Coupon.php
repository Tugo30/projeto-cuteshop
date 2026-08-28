<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Coupon extends Model
{
    protected $fillable = ['codigo', 'tipo', 'valor', 'validade', 'active'];
    public function orders()
    {
        return $this->hasMany(Order::class);
    }
}
