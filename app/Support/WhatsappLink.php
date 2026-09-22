<?php

namespace App\Support;

use Illuminate\Support\Facades\Auth;


class WhatsappLink
{


    /**
     * Mona a URL wa.me com mensagem pré preenchida.
     * 
     * @param string|null $orderCode do pedido, se apágina teiver contexto de pedido
     * @param string|null $productName do produto, se a página tiver contexto de produto
     */

    public static function build(?string $orderCode = null, ?string $productName = null) : string
    {
        $number = config('services.whatsapp.support_number');

        $lines = ['Olá! Preciso de ajuda com a zLuz.'];

        if (Auth::check()) {
            $lines[] = 'Meu nome: ' . Auth::user()->name;
        }

        if ($orderCode) {
            $lines[] = 'Pedido: #' . $orderCode;
        }

        if($productName){
            $lines[] = 'Produto: #' . $productName;
        }

        $message = implode("\n", $lines);

        return 'https://wa.me/' . $number . '?text=' . urlencode($message);
    }

}
