<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class WhatsappClick extends Model
{
    protected $fillable = [
        'user_id',
        'order_code',
        'product_name',
        'page_url',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
