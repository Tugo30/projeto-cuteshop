<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Services\CheckoutService;
use BaconQrCode\Renderer\Image\SvgImageBackEnd;
use BaconQrCode\Renderer\ImageRenderer;
use BaconQrCode\Renderer\RendererStyle\RendererStyle;
use BaconQrCode\Writer;
use Illuminate\Http\Request;

class CheckoutController extends Controller
{
    public function __construct(private CheckoutService $checkout) {}

    public function page()
    {
        $cartService = app(\App\Services\CartService::class);
        $cart = $cartService->load();

        return view('checkout.checkout', [
            'cart' => $cart
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'customer_name'     => 'required|string|min:3|max:255',
            'customer_email'    => 'required|email|max:255',
            'customer_phone'    => 'nullable|string|max:20',
            'customer_document' => 'nullable|string|max:20',
            'ship_zipcode'      => 'required|string|max:9',
            'ship_street'       => 'required|string|max:255',
            'ship_number'       => 'required|string|max:20',
            'ship_complement'   => 'nullable|string|max:100',
            'ship_district'     => 'required|string|max:100',
            'ship_city'         => 'required|string|max:100',
            'ship_state'        => 'required|string|size:2',
        ]);

        // 1. Instancia o CartService via container
        $cartService = app(\App\Services\CartService::class);
        $cart = $cartService->load();

        // 2. Se o frete ainda não foi calculado ou se o CEP digitado no checkout for diferente do carrinho, calcula agora
        if ($cart->shipping_cents === null || $cart->shipping_cep !== $data['ship_zipcode']) {
            $superFrete = app(\App\Services\SuperFreteService::class);

            try {
                $result = $superFrete->cheapestForCart($cart, $data['ship_zipcode']);

                $cart->update([
                    'shipping_cep'     => $data['ship_zipcode'],
                    'shipping_cents'   => $result['cents'],
                    'shipping_service' => $result['service'],
                ]);
            } catch (\Exception $e) {
                return response()->json([
                    'message' => 'Erro ao calcular frete para este CEP: ' . $e->getMessage(),
                    'errors'  => ['ship_zipcode' => ['CEP inválido ou sem cobertura de frete.']]
                ], 422);
            }
        }

        // 3. Cria o pedido normalmente com o frete garantido
        $order = $this->checkout->createOrder($data);

        return response()->json([
            'order_code'  => $order->code,
            'redirect_to' => route('checkout.pix', $order->code),
        ], 201);
    }

    public function pixPage(string $code)
    {
        $order = Order::where('code', $code)->firstOrFail();

        return view('checkout.checkout-pix', ['orderCode' => $order->code]);
    }

    public function pixData(string $code)
    {
        $order = Order::with(['items', 'payment'])->where('code', $code)->firstOrFail();

        if ($order->isExpired()) {
            $this->checkout->cancelExpired();
            $order->refresh();
        }

        $payment = $order->payment;

        return response()->json([
            'code'        => $order->code,
            'status'      => $order->status,
            'total'       => $order->total_cents / 100,
            'expires_at'  => $order->expires_at,
            'pix_payload' => $payment?->pix_payload,
            'qr_svg'      => $payment?->pix_payload ? $this->qrSvg($payment->pix_payload) : null,
            'items'       => $order->items->map(fn($i) => [
                'name'     => $i->product_name,
                'size'     => $i->variant_size,
                'quantity' => $i->quantity,
                'total'    => $i->total_cents / 100,
            ]),
        ]);
    }

    /** Polling do front: "já caiu?" */
    public function status(string $code)
    {
        $order = Order::where('code', $code)->firstOrFail();

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
