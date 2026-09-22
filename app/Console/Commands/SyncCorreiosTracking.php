<?php

namespace App\Console\Commands;

use App\Models\Order;
use App\Services\Correios\CorreiosTrackingService;
use Illuminate\Console\Command;

class SyncCorreiosTracking extends Command
{
    protected $signature = 'orders:sync-tracking';

    protected $description = 'Consulta o rastro CWS e atualiza a timeline dos pedidos enviados';

    public function handle(CorreiosTrackingService $tracking): int
    {
        if(! $tracking->configured()) {
            $this->warn('Correios CWS não configurado.');

            return self::SUCCESS;
        }

        $orders = Order::query()
            ->whereNotNull('tracking_code')
            ->where('tracking_code', '!=', '')
            ->whereIn('status', ['paid', 'preparing', 'shipped'])
            ->get();

        $applied = 0;

        foreach($orders as $order) {
            $applied += $tracking->syncOrder($order);
        }

        $this->info("{$orders->count()} pedido(s) consultado(s), {$applied} evento(s) novo(s).");

        return self::SUCCESS;
    }
}