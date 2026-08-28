<?php

namespace App\Console\Commands;


use App\Models\Cart;
use App\Notifications\AbandonedCartReminder;
use Illuminate\Console\Command;

class SendAbandonedCartReminders extends Command
{
    protected $signature = 'cart:remind-abandoned';
    protected $description = 'Envia e-mail de recuperação para carrinhos abandonados de clientes logados';

    public function handle(): void
    {
        $carts = Cart::whereNotNull('user_id')
            ->whereHas('items')
            ->where('updated_at', '<=', now()->subHours(2))
            ->where(function ($q) {
                $q->whereNull('abandoned_email_sent_at')
                    ->orWhereColumn('abandoned_email_sent_at', '<', 'updated_at');
            })
            ->with(['items.variant.product', 'user'])
            ->get();

        foreach ($carts as $cart) {
            $cart->user->notify(new AbandonedCartReminder($cart));
            $cart->update(['abandoned_email_sent_at' => now()]);
        }
        $this->info("{carts->count()} e-mail(s) de recuperação enviado(s).");
    }
}
