<?php

use App\Http\Controllers\ProductController;
use App\Http\Controllers\ShippingController;
use Illuminate\Support\Facades\Route;

Route::get('/produtos/data', [ProductController::class, 'homeData']);
Route::post('/frete/calcular', [ShippingController::class, 'calculate'])
    ->middleware('throttle:20,1');
