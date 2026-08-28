<?php

return [
    'key'            => env('PIX_KEY'),
    'merchant_name'  => env('PIX_MERCHANT_NAME', 'CUTESHOP'),
    'merchant_city'  => env('PIX_MERCHANT_CITY', 'SAO PAULO'),
    'expires_minutes'=> env('PIX_EXPIRES_MINUTES', 30),
];