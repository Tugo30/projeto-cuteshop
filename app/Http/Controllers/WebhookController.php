<?php

namespace App\Http\Controllers;

use App\Services\CheckoutService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class WebhookController extends Controller
{
    public function __construct(private CheckoutService $checkout) {}

    public function getnet(Request $request)
    {
        $secret = (string) config('services.getnet.webhook_secret');

        if ($secret === '') {
            Log::warning('Webhook Getnet: GETNET_WEBHOOK_SECRET ausente');

            return response()->json(['error' => 'misconfigured'], 401);
        }

        $token = (string) (
            $request->header('X-Callback-Token')
            ?? $request->header('X-Getnet-Token')
            ?? $request->query('token')
            ?? ''
        );

        if ($token === '' || ! hash_equals($secret, $token)) {
            return response()->json(['error' => 'Assinatura invalida'], 401);
        }

        $payload = $request->all();

        $paymentId = (string) (
            $request->input('payment_id')
            ?? $request->input('data.payment_id')
            ?? $request->input('data.id')
            ?? $request->input('id')
            ?? ''
        );

        if ($paymentId === '') {
            return response()->json(['ignored' => true]);
        }

        try {
            $result = $this->checkout->processWebhook($payload, $paymentId);

            if (! empty($result['not_found'])) {
                return response()->json(['not_found' => true], 404);
            }

            return response()->json($result);
        } catch (\Throwable $e) {
            Log::error('Webhook Getnet: falha', [
                'provider_id' => $paymentId,
                'err'         => $e->getMessage(),
            ]);

            return response()->json(['error' => 'temporario'], 500);
        }
    }
}
