<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Services\CheckoutService;
use Illuminate\Http\Request;
use App\Services\OrderStatusService;

class OrderController extends Controller
{

    public function __construct(private CheckoutService $checkout) {}

    public function page()
    {
        return view('orders.orders');
    }

    public function myOrders(Request $request)
    {
        $orders = Order::where('user_id', $request->user()->id)
            ->with('items')
            ->latest()
            ->get()
            ->map(fn($o) => [
                'code'          => $o->code,
                'status'        => $o->status,
                'total'         => $o->total_cents / 100,
                'created_at'    => $o->created_at,
                'expires_at'    => $o->expires_at,
                'tracking_code' => $o->tracking_code,
                'can_pay'       => $o->status === 'pending' && (! $o->expires_at || $o->expires_at->isFuture()),
                'can_cancel'    => $o->status === 'pending',
                'items'         => $o->items->map(fn($i) => [
                    'name'     => $i->product_name,
                    'size'     => $i->variant_size,
                    'quantity' => $i->quantity,
                    'image'    => $i->product_image,
                ]),
                'payment_method' => $o->payment?->method ?? 'pix',
                'pay_url'       => route('checkout.pay', $o->code),
            ]);

        return response()->json($orders);
    }

    public function detail(string $code)
    {
        $order = Order::with('items')
            ->where('code', $code)
            ->where('user_id', auth()->id())   // barra IDOR: só o dono vê
            ->firstOrFail();

        return response()->json([
            'code'          => $order->code,
            'status'        => $order->status,
            'tracking_code' => $order->tracking_code,
            'created_at'    => $order->created_at,
            'items'         => $order->items->map(fn($i) => [
                'name'     => $i->product_name,
                'size'     => $i->variant_size,
                'quantity' => $i->quantity,
                'image'    => $i->product_image,
            ]),
            'progress'      => app(OrderStatusService::class)->progress($order),
        ]);
    }

    public function cancel(Request $request, string $code)
    {
        $order = Order::where('code', $code)
            ->where('user_id', $request->user()->id)
            ->firstOrFail();

        if ($order->status !== 'pending') {
            return response()->json([
                'message' => 'Esse pedido não pode mais ser cancelado.'
            ], 422);
        }

        $this->checkout->cancelOrder($order);

        return response()->json(['message' => 'Pedido cancelado com sucesso.']);
    }
}
