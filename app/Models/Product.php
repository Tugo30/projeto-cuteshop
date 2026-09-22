<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Database\Factories\ProductFactory;
use Illuminate\Database\Eloquent\SoftDeletes;

class Product extends Model
{
    use HasFactory, SoftDeletes;

    protected static function newFactory()
    {
        return ProductFactory::new();
    }

    protected $fillable = [
        'name',
        'category_id',
        'description',
        'image',
        'active',
    ];

    protected $casts = [
        'active' => 'boolean',
    ];

    protected $appends = ['image_url'];

    public function variants()
    {
        return $this->hasMany(ProductVariant::class);
    }

    public function coverImage()
    {
        return $this->hasOne(ProductImage::class)->where('is_cover', true);
    }


    public function specifications()
    {
        return $this->hasMany(ProductSpecification::class)->orderBy('sort_order');
    }

    public function category()
    {
        return $this->belongsTo(Category::class);
    }

    public function reviews()
    {
        return $this->hasMany(Review::class)->where('approved', true)->latest();
    }

    public function images()
    {
        return $this->hasMany(ProductImage::class)->orderBy('sort_order');
    }

    public function wishlistedBy()
    {
        return $this->belongsToMany(User::class, 'wishlists')->withTimestamps();
    }

    /**
     * Resolve a imagem principal do produto: a marcada com is_cover,
     * ou a primeira por sort_order caso nenhuma tenha sido definida ainda
     * (ex.: produtos criados antes da coluna is_cover existir).
     * Corrige o bug de show(): antes essa propriedade não existia e
     * sempre retornava null (metaImage do produto ficava sempre vazio).
     */

    public function getImageUrlAttribute(): ?string
    {
        if ($this->relationLoaded('coverImage') && $this->coverImage) {
            return $this->coverImage->url ?? '/storage/' . $this->coverImage->path;
        }
        if (!$this->relationLoaded('images')) {
            return null;
        }
        $cover = $this->images->firstWhere('is_cover', true) ?? $this->images->first();
        return $cover?->url;
    }
}
