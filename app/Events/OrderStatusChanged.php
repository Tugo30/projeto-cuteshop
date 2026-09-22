<?php

namespace App\Events;

use App\Models\Order;
use App\Models\OrderStatusEvent;
use Illuminate\Foundation\Events\Dispatchable;

class OrderStatusChanged
{
    use Dispatchable;

    public function __construct(
        public Order $order,
        public OrderStatusEvent $event,
    ) {}
}
