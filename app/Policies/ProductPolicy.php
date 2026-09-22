<?php

namespace App\Policies;

use App\Models\Product;
use App\Models\User;

class ProductPolicy
{
    /** Papéis que têm QUALQUER acesso ao painel admin de produtos */
    private const STAFF = ['admin', 'gerente', 'estoquista', 'atendente'];

    /** Papéis que podem criar/editar dados cadastrais do produto */
    private const EDITORS = ['admin', 'gerente'];

    /** Papéis que podem alterar estoque (além dos editores) */
    private const STOCK_MANAGERS = ['admin', 'gerente', 'estoquista'];

    public function viewAny(User $user): bool
    {
         return $user->isStaff();
    }

    public function view(User $user, Product $product): bool
    {
        return $this->viewAny($user);
    }

    public function create(User $user): bool
    {
        return in_array($user->assignedRole?->nome, self::EDITORS, true);
    }

    public function update(User $user, Product $product): bool
    {
        return in_array($user->assignedRole?->nome, self::EDITORS, true);
    }

    /** Usada especificamente pra ajuste de estoque, separado da edição geral */
    public function updateStock(User $user, Product $product): bool
    {
        return in_array($user->assignedRole?->nome, self::STOCK_MANAGERS, true);
    }

    public function delete(User $user, Product $product): bool
    {
        return $user->isAdmin();
    }

    public function restore(User $user, Product $product): bool
    {
        return $user->isAdmin();
    }
}