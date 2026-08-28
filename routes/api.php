<?php

use App\Models\User;
use Illuminate\Support\Facades\Route;
use Illuminate\Http\Request;
use App\Http\Controllers\CheckoutController;

// Rota para retornar o usuário ATUALMENTE logado
Route::middleware('auth')->get('/me', function (Request $request) {
    return $request->user();
});

Route::middleware('auth')->get('/users', function () {
    return User::with('role')->get();
});   

Route::post('/checkout', [CheckoutController ::class, 'store']);