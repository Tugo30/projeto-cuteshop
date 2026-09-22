<?php

namespace App\Mail;

use App\Models\Order;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class PaymentApproved extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(public Order $order) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "Pagamento aprovado — pedido {$this->order->code}",
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.payment-confirmed',
            with: [
                'order' => $this->order->loadMissing('items'),
            ],
        );
    }
}
