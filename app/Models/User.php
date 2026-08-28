<?php

namespace App\Models;

use App\Models\Role;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticable;
use Illuminate\Notifications\Notifiable;

class User extends Authenticable
{
    use SoftDeletes;

    use Notifiable;

    protected $fillable = [
        'role_id',
        'name',
        'email',
        'username',
        'password',
        'terms_accepted_at',
    ];

    protected $hidden = [
        'password',
        'token'
    ];

    protected $casts = [
        'email_verified_at' => 'datetime',
        'last_login_at' => 'datetime',
        'blocked_until' => 'datetime',
        'terms_accepted_at' => 'datetime',
        'active' => 'boolean'
    ];  

    public function role()
    {
        return $this->belongsTo(Role::class);
    }

    public function isAdmin()
    {
        return $this->role?->nome === 'admin';
    }

    public function wishlist()
    {
        return $this->belongsToMany(Product::class, 'wishlists')->withTimestamps();
    }
}
