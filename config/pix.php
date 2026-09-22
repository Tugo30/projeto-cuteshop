<?php

return [
    'key'                  => env('PIX_KEY'),
    'merchant_name'        => env('PIX_MERCHANT_NAME', 'CUTESHOP'),
    'merchant_city'        => env('PIX_MERCHANT_CITY', 'SAO PAULO'),
    'expires_minutes'      => env('PIX_EXPIRES_MINUTES', 30),
    'boleto_expires_hours' => env('BOLETO_EXPIRES_HOURS', 72),
    'card_expires_minutes' => env('CARD_EXPIRES_MINUTES', 60),
];