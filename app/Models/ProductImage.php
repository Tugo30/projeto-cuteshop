<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Storage;

class ProductImage extends Model
{
    protected $fillable = ['product_id', 'path', 'sort_order', 'is_cover'];

    protected $casts = [
        'is_cover' => 'boolean',
    ];

    protected $appends = ['url'];

    public function getUrlAttribute(): string
    {
        return Storage::url($this->path);
    }

    public function product() 
    {
        return $this->belongsTo(Product::class);
    }
}