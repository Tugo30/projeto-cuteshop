<?php

namespace App\Policies;

use App\Models\Coupon;
use App\Models\User;

class CouponPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->isStaff();
    }

    public function create(User $user): bool
    {
        return in_array($user->assignedRole?->nome, ['admin', 'gerente'], true);
    }

    public function update(User $user, Coupon $coupon): bool
    {
        return $this->create($user);
    }

    public function delete(User $user, Coupon $coupon): bool
    {
        return $user->isAdmin();
    }
}
