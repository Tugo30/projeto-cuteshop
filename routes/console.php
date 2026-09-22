<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote')->hourly();

Schedule::command('orders:cancel-expired')->everyFiveMinutes();
Schedule::command('orders:sync-tracking')->everyThirtyMinutes();
Schedule::command('cart:remind-abandoned')->hourly();
Schedule::command('store:backup --keep=14')->dailyAt('03:00');
