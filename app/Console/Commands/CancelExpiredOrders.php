<?php

namespace App\Console\Commands;

use App\Services\CheckoutService;
use Illuminate\Console\Command;

class CancelExpiredOrders extends Command
{
    protected $signature = 'orders:cancel-expired';

    protected $description = 'Marca como expirados os pedidos PIX sem pagamento';

    public function handle(CheckoutService $checkout): int
    {
        $count = $checkout->cancelExpired();
        $this->info("{$count} pedido(s) expirado(s).");

        return self::SUCCESS;
    }
}
