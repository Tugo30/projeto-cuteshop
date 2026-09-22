<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ReviewPhoto extends Model
{
    protected $fillable =['review_id', 'path', 'sort_order'];

    protected $appends = ['url'];

    public function review()
    {
        return $this->belongsTo(Review::class);
    }

    public function getUrlAttribute() : string
    {
           return '/storage/'.$this->path;
    }
}
