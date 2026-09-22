<?php

namespace App\Providers;


use Illuminate\Support\ServiceProvider;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use App\Models\Coupon;
use App\Models\Category;
use App\Models\Product;
use App\Policies\CategoryPolicy;
use App\Policies\CouponPolicy;
use App\Policies\ProductPolicy;
use Illuminate\Support\Facades\Gate;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // LOGIN - chave por e-mail + Ip (não pune IP compartilhado de quem só errou a senha)
        RateLimiter::for('login', function (Request $request) {
            $chave = mb_strtolower((string) $request->input('email')) . '|' . $request->ip();
            return [
                Limit::perMinute(8)->by($chave),
                Limit::perMinute(15, 25)->by('login|' . $request->ip()),
            ];
        });

        // CADASTRO - chave IP; generoso na rajada, teto por hora contra ciração em massa
        RateLimiter::for('register', function (Request $request) {
            return [
                Limit::perMinute(15)->by($request->ip()),
                Limit::perHour(60)->by('register|' . $request->ip()),
            ];
        });

        // RECUPERAÇÂO / RESET DA SENHA - evita spam de e-mail, mantém o uso normal
        RateLimiter::for('password', function (Request $request) {
            $chave = mb_strtolower((string) $request->input('email')) . '|' . $request->ip();
            return [
                Limit::perMinute(6)->by($chave),
                Limit::perMinutes(30, 20)->by('password|' . $request->ip())
            ];
        });


        Gate::policy(Product::class, ProductPolicy::class);
        Gate::policy(Category::class, CategoryPolicy::class);
        Gate::policy(Coupon::class, CouponPolicy::class);
    }
}
