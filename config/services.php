<?php

return [

    'postmark' => [
        'token' => env('POSTMARK_TOKEN'),
    ],

    'getnet' => [
        'client_id'      => env('GETNET_CLIENT_ID'),
        'client_secret'  => env('GETNET_CLIENT_SECRET'),
        'seller_id'      => env('GETNET_SELLER_ID'),
        'sandbox'        => env('GETNET_SANDBOX', true),
        'webhook_secret' => env('GETNET_WEBHOOK_SECRET'),
        'public_url'     => env('APP_URL'),
        'fake'           => env('GETNET_FAKE', false),
    ],

    'whatsapp' => [
        'support_number' => env('WHATSAPP_SUPPORT_NUMBER'),
    ],

    'superfrete' => [
        'token'    => env('SUPERFRETE_TOKEN'),
        'sandbox'  => env('SUPERFRETE_SANDBOX', true),
        'from_cep' => env('STORE_POSTAL_CODE', '15014090'),
        'email'    => env('STORE_EMAIL', 'cutshopbrasil@gmail.com'),
    ],

    'correios' => [
        'user'            => env('CORREIOS_CWS_USER'),
        'api_token'       => env('CORREIOS_CWS_API_TOKEN'),
        'contrato'        => env('CORREIOS_CONTRATO'),
        'cartao_postagem' => env('CORREIOS_CARTAO_POSTAGEM'),
        'dr'              => env('CORREIOS_DR'),
        'sandbox'         => env('CORREIOS_CWS_SANDBOX', true),
        'from_cep'        => env('STORE_POSTAL_CODE', '15014090'),
        'services'        => [
            [
                'code' => env('CORREIOS_SERVICO_PAC', '03298'),
                'name' => env('CORREIOS_SERVICO_PAC_NOME', 'PAC'),
            ],
            [
                'code' => env('CORREIOS_SERVICO_SEDEX', '03220'),
                'name' => env('CORREIOS_SERVICO_SEDEX_NOME', 'SEDEX'),
            ],
        ],
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

];
