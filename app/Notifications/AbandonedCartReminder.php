<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use App\Models\Cart;

class AbandonedCartReminder extends Notification
{
    use Queueable;

    /**
     * Create a new notification instance.
     */
    public function __construct(public Cart $cart) {}

    /**
     * Get the notification's delivery channels.
     *
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    /**
     * Get the mail representation of the notification.
     */
    public function toMail($notifiable)
    {
        $total = $this->cart->totalCents() / 100;

        $mail = (new MailMessage)
            ->subject('Você esqueceu algo na sua sacola zLuz 👀')
            ->greeting("Oi, {$notifiable->username}!")
            ->line('Separamos os itens da sua sacola, eles ainda estão te esperando:'); // corrigido

        foreach ($this->cart->items as $item) {
            $nome = $item->variant->product->name ?? 'Produto';
            $mail->line("• {$item->quantity}x {$nome}");
        }

        return $mail
            ->line('Total: R$ ' . number_format($total, 2, ',', '.'))
            ->action('Finalizar minha compra', url('/carrinho'))
            ->line('Se preferir, é só ignorar este e-mail.')
            ->salutation('— Equipe zLuz'); // NOVO — troca "Regards, Laravel"
    }

    /**
     * Get the array representation of the notification.
     *
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            //
        ];
    }
}
