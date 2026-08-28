<?php

namespace App\Http\Controllers;

use Illuminate\Support\Facades\Auth;
use Illuminate\View\View;
use App\Models\User;
use App\Models\Service;
use App\Models\Category;
use App\Models\PaymentMethod;

class MainController extends Controller
{
    public function home(): View
    {
        $user = Auth::user();

        return view('home', [
            'user' => $user
        ]);
    }

    public function dashboardData()
    {
        return response()->json([
            'total_users'           => User::count(),
            'active_users'          => User::where('active', 1)->count(),
            'inactive_users'        => User::where('active', 0)->orWhereNull('active')->count(),
            'total_services'        => Service::count(),
            'total_categories'      => Category::count(),
            'total_payment_methods' => PaymentMethod::count(),
        ]);
    }

    public function categoriesWithProducts()
    {
        $categories = Category::whereHas('products', function ($query) {
            $query->where('active', true);
        })
            ->take(5) // Limita a exibir no máximo 5 categorias na Home
            ->with(['products' => function ($query) {
                $query->where('active', true)->with('variants')->take(10); // Máximo 10 produtos por carrossel
            }])
            ->get(['id', 'name']);

        return response()->json($categories);
    }
}
