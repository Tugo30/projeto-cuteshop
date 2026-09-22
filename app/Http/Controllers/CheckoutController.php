<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreCheckoutRequest;
use App\Models\Order;
use App\Services\CheckoutService;
use BaconQrCode\Renderer\Image\SvgImageBackEnd;
use BaconQrCode\Renderer\ImageRenderer;
use BaconQrCode\Renderer\RendererStyle\RendererStyle;
use BaconQrCode\Writer;
use Illuminate\Support\Facades\DB;
use Illuminate\Http\Request;
use RuntimeException;

class CheckoutController extends Controller
{
    public function __construct(private CheckoutService $checkout) {}

    public function page()
    {
        $cart = app(\App\Services\CartService::class)->load();

        return view('checkout.checkout', ['cart' => $cart]);
    }

    public function store(StoreCheckoutRequest $request)
    {
        $data = $request->validated();
        $cart = app(\App\Services\CartService::class)->load();

        if ($cart->items->isEmpty()) {
            return response()->json([
                'message' => 'Carrinho vazio.',
                'errors'  => ['cart' => ['Carrinho vazio.']],
            ], 422);
        }

        $hasShipping = $cart->shipping_cents !== null && filled($cart->shipping_service);
        $cartCep = preg_replace('/\D/', '', (string) $cart->shipping_cep);

        if (! $hasShipping) {
            return response()->json([
                'message' => 'Selecione o frete na sacola antes de pagar.',
                'errors'  => ['cart' => ['Frete não selecionado.']],
            ], 422);
        }

        if ($cartCep !== $data['ship_zipcode']) {
            return response()->json([
                'message' => 'O CEP da entrega é diferente do frete calculado. Volte à sacola e calcule novamente.',
                'errors'  => ['ship_zipcode' => ['CEP diferente do frete selecionado.']],
            ], 422);
        }

        return DB::transaction(function () use ($request, $data) {
            $pending = Order::query()
                ->where('user_id', $request->user()->id)
                ->where('status', 'pending')
                ->where(function ($q) {
                    $q->whereNull('expires_at')->orWhere('expires_at', '>', now());
                })
                ->latest()
                ->lockForUpdate()
                ->first();

            if ($pending) {
                return response()->json([
                    'message'     => 'Você já tem um pedido aguardando pagamento.',
                    'order_code'  => $pending->code,
                    'redirect_to' => route('checkout.pay', $pending->code),
                ], 409);
            }

            try {
                $order = $this->checkout->createOrder($data);
            } catch (RuntimeException $e) {
                return response()->json(['message' => $e->getMessage()], 422);
            }

            return response()->json([
                'order_code'  => $order->code,
                'redirect_to' => route('checkout.pay', $order->code),
            ], 201);
        });
    }

    private function ownedOrder(string $code): Order
    {
        $order = Order::where('code', $code)->firstOrFail();

        if ((int) $order->user_id !== (int) auth()->id()) {
            abort(404);
        }

        return $order;
    }

    public function pixPage(string $code)
    {
        $order = $this->ownedOrder($code);

        return view('checkout.checkout-pix', ['orderCode' => $order->code]);
    }

    public function paymentData(string $code)
    {
        $order = $this->ownedOrder($code);
        $order->load(['items', 'payment']);

        if ($order->isExpired()) {
            $this->checkout->cancelExpired();
            $order->refresh()->load(['items', 'payment']);
        }

        $payment = $order->payment;

        return response()->json([
            'code'        => $order->code,
            'status'      => $order->status,
            'method'      => $payment?->method ?? 'getnet',
            'total'       => $order->total_cents / 100,
            'expires_at'  => $order->expires_at,
            'items'       => $order->items->map(fn($i) => [
                'name'     => $i->product_name,
                'size'     => $i->variant_size,
                'quantity' => $i->quantity,
                'total'    => $i->total_cents / 100,
            ]),
            'pix_payload' => $payment?->pix_payload,
            'qr_svg'      => $payment?->pix_payload ? $this->qrSvg($payment->pix_payload) : null,
            'ticket_url'  => $payment?->ticketUrl(),
            'barcode'     => $payment?->barcode(),
        ]);
    }

    public function payCard(Request $request, string $code)
    {
        $order = $this->ownedOrder($code);

        $tokenized = $request->validate([
            'number_token'     => 'required|string',
            'cardholder_name'  => 'required|string',
            'expiration_month' => 'required|string',
            'expiration_year'  => 'required|string',
        ]);

        try {
            $order = $this->checkout->chargeCardPayment($order, $tokenized);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json(['status' => $order->status, 'paid' => $order->status === 'paid']);
    }

    public function status(string $code)
    {
        $order = $this->ownedOrder($code);

        return response()->json([
            'status' => $order->status,
            'paid'   => $order->status === 'paid',
        ]);
    }

    private function qrSvg(string $payload): string
    {
        $writer = new Writer(new ImageRenderer(new RendererStyle(300), new SvgImageBackEnd()));

        return 'data:image/svg+xml;base64,' . base64_encode($writer->writeString($payload));
    }
}
