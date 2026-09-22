<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Models\Payment;
use App\Services\CheckoutService;
use App\Services\GetnetService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class WebhookController extends Controller
{
    public function __construct(
        private GetnetService $getnet,
        private CheckoutService $checkout
    ) {}

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
            $data = $this->getnet->fetchPayment($paymentId);

            if (! $this->getnet->isApproved($data)) {
                return response()->json(['status' => $data['status'] ?? 'unknown']);
            }

            $payment = $this->findGetnetPayment($data, $paymentId);

            if (! $payment) {
                Log::warning('Webhook Getnet: pagamento local nao encontrado', [
                    'provider_id' => $paymentId,
                    'order_id'    => $data['order_id'] ?? data_get($data, 'order.order_id'),
                ]);

                return response()->json(['not_found' => true], 404);
            }

            $amount = $data['amount']
                ?? data_get($data, 'payment.amount')
                ?? data_get($data, 'order.amount');

            if ($amount === null) {
                Log::critical('Webhook Getnet: amount ausente na consulta', [
                    'provider_id' => $paymentId,
                    'order'       => $payment->order?->code,
                ]);

                return response()->json(['error' => 'amount ausente'], 422);
            }

            $data['id'] = $paymentId;
            $data['paid_method'] = $this->guessGetnetMethod($payment, $paymentId);
            $data['amount'] = (int) $amount;

            $this->checkout->confirmPayment($payment, $data);

            return response()->json(['ok' => true]);
        } catch (\Throwable $e) {
            Log::error('Webhook Getnet: falha', [
                'provider_id' => $paymentId,
                'err'         => $e->getMessage(),
            ]);

            return response()->json(['error' => 'temporario'], 500);
        }
    }

    private function findGetnetPayment(array $data, string $paymentId): ?Payment
    {
        $found = Payment::where('provider', 'getnet')
            ->where('provider_id', $paymentId)
            ->first();

        if ($found) {
            return $found;
        }

        $found = Payment::where('provider', 'getnet')
            ->where(function ($q) use ($paymentId) {
                $q->where('provider_response->pix_id', $paymentId)
                    ->orWhere('provider_response->boleto_id', $paymentId)
                    ->orWhere('provider_response->card_id', $paymentId);
            })
            ->first();

        if ($found) {
            return $found;
        }

        $orderCode = $data['order_id'] ?? data_get($data, 'order.order_id');

        if (! is_string($orderCode) || $orderCode === '') {
            return null;
        }

        $order = Order::where('code', $orderCode)->first();

        if (! $order) {
            return null;
        }

        return Payment::where('order_id', $order->id)->latest('id')->first();
    }

    private function guessGetnetMethod(Payment $payment, string $paymentId): string
    {
        $raw = $payment->provider_response ?? [];

        return match ($paymentId) {
            $raw['boleto_id'] ?? null => 'boleto',
            $raw['card_id'] ?? null   => 'credit_card',
            default                   => 'pix',
        };
    }
}
