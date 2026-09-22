<?php

namespace App\Models;

use App\Models\Role;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticable;
use Illuminate\Notifications\Notifiable;

class User extends Authenticable
{
    use SoftDeletes;

    use HasFactory, Notifiable;

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
        'token',
        'remember_token',
        'blocked_until'
    ];

    protected $casts = [
        'email_verified_at' => 'datetime',
        'last_login_at' => 'datetime',
        'blocked_until' => 'datetime',
        'terms_accepted_at' => 'datetime',
        'active' => 'boolean'
    ];

    protected $appends = [
        'is_admin',
        'is_staff'
    ];
    public function orders()
    {
        return $this->hasMany(\App\Models\Order::class);
    }

    public function assignedRole()
    {
        return $this->belongsTo(Role::class, 'role_id');
    }

    public function isAdmin()
    {
        return $this->assignedRole?->nome === 'admin';
    }

    public function isStaff(): bool
    {
        return in_array($this->assignedRole?->nome, ['admin', 'gerente', 'estoquista', 'atendente'], true);
    }

    public function getIsAdminAttribute(): bool
    {
        return $this->isAdmin();
    }

    public function getIsStaffAttribute(): bool
    {
        return $this->isStaff();
    }

    public function wishlist()
    {
        return $this->belongsToMany(Product::class, 'wishlists')->withTimestamps();
    }
}
