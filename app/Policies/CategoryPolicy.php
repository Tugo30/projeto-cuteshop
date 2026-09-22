<?php

namespace App\Policies;

use App\Models\Category;
use App\Models\User;

class CategoryPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->isStaff();
    }

    public function view(User $user, Category $category): bool
    {
        return $user->isStaff();
    }

    public function create(User $user): bool
    {
         return in_array($user->assignedRole?->nome, ['admin', 'gerente'], true);
    }

    public function update(User $user, Category $category): bool
    {
       return in_array($user->assignedRole?->nome, ['admin', 'gerente'], true);
    }

    public function delete(User $user, Category $category): bool
    {
         return $user->isAdmin();
    }
}
