<?php

namespace App\Http\Controllers;

use App\Models\Payment;
use App\Services\CheckoutServic;
use App\Services\CheckoutService;
use App\Services\MercadoPagoService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class WebhookController extends Controller{

    public function __construct(
        private MercadoPagoService $mercadoPago,
        private CheckoutService $checkout,
    )
    {}

    public function mercadoPago(Request $request)
    {
        $paymentId = $request->input("data.id") ?? $request->query("id");
        $topic = $request->input('type') ?? $request->query('topic');

        if ($topic !== 'payment' || ! $paymentId ) {
            return response()->json(['ignored' => true]);
        }

        $data = $this->mercadoPago->fetchPayment($paymentId);

        if(($data['status'] ?? null) !== 'approved'){
            return response()->json(['status' => $data['status'] ?? 'unkown']);
        }

        $payment = Payment::where('provider_id', (string) $paymentId)->first();

        if(! $payment){
            Log::Warning("WebHook MP: pagamento não encontrado", ['provider_id' => $paymentId]);
            return response()->json(['not_found' => true], 404);
        }

        $this->checkout->confirmPayment($payment, $data);

        return response()->json(['ok' => true]);

    }

}