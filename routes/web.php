<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Http\Request;

use App\Http\Controllers\AuthController;
use App\Http\Controllers\CategoryController;
use App\Http\Controllers\MainController;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\CartController;
use App\Http\Controllers\CheckoutController;
use App\Http\Controllers\ReviewController;
use App\Http\Controllers\OrderController;
use App\Http\Controllers\Admin\OrderController as AdminOrderController;
use App\Http\Controllers\Admin\CouponController as AdminCouponController;
use App\Http\Controllers\SitemapController;
use App\Http\Controllers\WebhookController;
use App\Http\Controllers\Admin\DashboardController;
use App\Http\Controllers\WishlistController;
use App\Http\Controllers\WhatsappClickController;

/*
|--------------------------------------------------------------------------
| PÚBLICAS — acessíveis para qualquer um, logado ou não
|--------------------------------------------------------------------------
*/

Route::get('/', [MainController::class, 'home'])->name('home');
Route::get('/api/categorias-produtos', [MainController::class, 'categoriesWithProducts'])->name('categories.products');
Route::get('/api/categorias', [MainController::class, 'categories'])->name('categories.index');
Route::get('/sitemap.xml', [SitemapController::class, 'index'])->name('sitemap');
Route::get('/produtos/data', [ProductController::class, 'index'])->name('products.data');
Route::get('/produtos/busca', [ProductController::class, 'search'])->name('products.search');
Route::get('/produtos/{id}/data', [ProductController::class, 'showData'])->name('products.show.data');
Route::get('/produtos/{id}', [ProductController::class, 'show'])->name('products.show');
Route::get('/privacidade', fn() => view('legal.privacidade'))->name('legal.privacy');
Route::get('/termos', fn() => view('legal.terms'))->name('legal.terms');


/* ---------- CARRINHO (público: visitante também compra) ---------- */
Route::get('/carrinho', [CartController::class, 'page'])->name('cart.page');

Route::prefix('api/cart')->middleware('throttle:40,1')->group(function () {
    Route::get('/', [CartController::class, 'index']);
    Route::post('/', [CartController::class, 'store']);

    Route::post('/frete', [CartController::class, 'calculateShipping'])->middleware('throttle:15,1');
    Route::post('/frete/selecionar', [CartController::class, 'selectShipping']);
    Route::post('/cupom', [CartController::class, 'applyCoupon'])->middleware('throttle:30,1');
    Route::delete('/cupom', [CartController::class, 'removeCoupon']);

    Route::put('/{itemId}', [CartController::class, 'update'])->whereNumber('itemId');
    Route::delete('/{itemId}', [CartController::class, 'destroy'])->whereNumber('itemId');
});

/* ---------- CHECKOUT ---------- */
Route::get('/checkout', [CheckoutController::class, 'page'])->middleware(['auth', 'throttle:30,1'])->name('checkout.page');


/* ---------- WEBHOOK (público — Getnet) ---------- */
// Route::post('/webhooks/mercadopago', [WebhookController::class, 'mercadoPago'])
//     ->middleware('throttle:300,1')
//     ->name('webhooks.mercadopago');
Route::post('/webhooks/getnet', [WebhookController::class, 'getnet'])
    ->middleware('throttle:300,1')
    ->name('webhooks.getnet');

/*
|--------------------------------------------------------------------------
| APENAS VISITANTE (não logado)
|--------------------------------------------------------------------------
*/
Route::middleware('guest')->group(function () {
    Route::get('/login', [AuthController::class, 'login'])->name('login');
    Route::post('/login', [AuthController::class, 'authenticate'])->middleware('throttle:login')->name('authenticate');

    Route::get('/register', [AuthController::class, 'register'])->name('register');
    Route::post('/register', [AuthController::class, 'store_user'])->middleware('throttle:register')->name('store_user');

    Route::get('/new_user_confirmation/{token}', [AuthController::class, 'new_user_confirmation'])->name('new_user_confirmation');

    Route::get('/forgot_password', [AuthController::class, 'forgot_password'])->name('forgot_password');
    Route::post('/forgot_password', [AuthController::class, 'send_reset_password_link'])->middleware('throttle:password')->name('send_reset_password_link');

    Route::get('/reset_password/{token}', [AuthController::class, 'reset_password'])->middleware('throttle:30,1')->name('reset_password');
    Route::post('/reset_password', [AuthController::class, 'reset_password_update'])->middleware('throttle:password')->name('reset_password_update');
});

/*
|--------------------------------------------------------------------------
| APENAS LOGADO (cliente final)
|--------------------------------------------------------------------------
*/
Route::middleware('auth')->group(function () {
    Route::get('/profile', [AuthController::class, 'profile'])->name('profile');
    Route::post('/profile', [AuthController::class, 'change_password'])->name('change_password');
    Route::post('/profile/password', [AuthController::class, 'changePasswordApi'])->name('profile.password');
    Route::delete('/profile/account', [AuthController::class, 'deleteAccountApi'])->name('profile.account');

    Route::get('/meus-pedidos', [OrderController::class, 'page'])->name('orders.page');

    Route::get('/logout', fn() => redirect()->route('home'));
    Route::post('/logout', [AuthController::class, 'logout'])->name('logout');

    Route::post('/produtos/{id}/avaliacoes', [ReviewController::class, 'store'])
        ->middleware('throttle:10,1')
        ->name('reviews.store');

    Route::post('/api/checkout', [CheckoutController::class, 'store'])->middleware('throttle:10,1')->name('checkout.store');

    /*
    |----------------------------------------------------------------------
    |                       WISHLIST
    |----------------------------------------------------------------------
    */
    Route::get('/favoritos', [WishlistController::class, 'page'])->name('wishlist.page');
    Route::get('/wishlist', [WishlistController::class, 'index']);
    Route::post('/wishlist/{product}/toggle', [WishlistController::class, 'toggle']);
    Route::get('/wishlist/{product}/check', [WishlistController::class, 'check']);

    /* ---------- PEDIDOS DO CLIENTE ---------- */
    Route::get('/api/meus-pedidos', [OrderController::class, 'myOrders'])->name('orders.mine');
    Route::post('/api/meus-pedidos/{code}/cancelar', [OrderController::class, 'cancel'])->name('orders.cancel');
    Route::get('/api/meus-pedidos/{code}', [OrderController::class, 'detail'])->name('orders.detail');

    /* ---------- Pagamentos ---------- */
    Route::get('/checkout/pix/{code}', [CheckoutController::class, 'pixPage'])->middleware('throttle:30,1')->name('checkout.pix');
    Route::get('/checkout/pagamento/{code}', [CheckoutController::class, 'pixPage'])->middleware('throttle:30,1')->name('checkout.pay');
    Route::get('/api/checkout/{code}/pagamento', [CheckoutController::class, 'paymentData'])->middleware('throttle:30,1')->where('code', 'CS-[A-Za-z0-9-]+')->name('checkout.payment.data');
    Route::get('/api/checkout/{code}/status', [CheckoutController::class, 'status'])->middleware('throttle:60,1')->where('code', 'CS-[A-Za-z0-9-]+')->name('checkout.status');
    Route::post('/api/checkout/{code}/cartao', [CheckoutController::class, 'payCard'])->middleware('throttle:10,1')->name('checkout.pay.card');

    /* ---------- SUPORTE ---------- */
    Route::post('/api/suporte/whatsapp-click', [WhatsappClickController::class, 'store'])
        ->middleware('throttle:30,1')
        ->name('whatsapp.click');

    /*
    |----------------------------------------------------------------------
    | ADMIN — JSON pro React consumir via axios
    |----------------------------------------------------------------------
    */
    Route::prefix('api/admin')->middleware(['auth', 'admin'])->group(function () {

        // PRODUTOS
        Route::get('/produtos', [ProductController::class, 'adminIndex']);
        Route::get('/produtos/{id}', [ProductController::class, 'adminShow']);
        Route::post('/produtos', [ProductController::class, 'store']);
        Route::put('/produtos/{id}', [ProductController::class, 'update']);
        Route::delete('/produtos/{id}', [ProductController::class, 'destroy']);

        // CATEGORIAS
        Route::get('/categorias', [CategoryController::class, 'index']);
        Route::post('/categorias', [CategoryController::class, 'store']);
        Route::put('/categorias/{id}', [CategoryController::class, 'update']);
        Route::delete('/categorias/{id}', [CategoryController::class, 'destroy']);

        // PEDIDOS (admin)
        Route::get('/pedidos', [AdminOrderController::class, 'index']);
        Route::get('/pedidos/{code}', [AdminOrderController::class, 'show']);
        Route::post('/pedidos/{code}/confirmar-pagamento', [AdminOrderController::class, 'confirmPayment']);
        Route::put('/pedidos/{code}/status', [AdminOrderController::class, 'updateStatus']);
        Route::put('/pedidos/{code}/rastreio', [AdminOrderController::class, 'updateTracking']);

        // CUPOM
        Route::get('/cupons', [AdminCouponController::class, 'index']);

        Route::get('/cupons/usuarios', [AdminCouponController::class, 'searchUsers']);
        Route::get('/cupons/{coupon}', [AdminCouponController::class, 'show']);
        Route::post('/cupons', [AdminCouponController::class, 'store']);
        Route::put('/cupons/{coupon}', [AdminCouponController::class, 'update']);
        Route::delete('/cupons/{coupon}', [AdminCouponController::class, 'destroy']);

        // DASHBOARD - MÉTRICAS
        Route::get('/metricas', [DashboardController::class, 'metrics']);
    });

    /*
    |----------------------------------------------------------------------
    | ADMIN — páginas (Blade puro, só monta a div e chama o React)
    |----------------------------------------------------------------------
    */
    Route::prefix('admin')->name('admin.')->middleware(['auth', 'admin'])->group(function () {

        Route::get('/dashboard', [DashboardController::class, 'page'])->name('dashboard.index');

        Route::get('/produtos', function () {
            return view('admin.products');
        })->name('products.index');

        Route::get('/produtos/{id}/editar', [ProductController::class, 'edit'])->name('products.edit');

        Route::get('/categorias', function () {
            return view('admin.categories');
        })->name('categories.index');

        Route::get('/pedidos', [AdminOrderController::class, 'page'])->name('orders.index');

        Route::get('/cupons', [AdminCouponController::class, 'page'])->name('coupons.index');
    });
});

Route::middleware('auth')->get('/api/me', function (Request $request) {
    return $request->user();
});
