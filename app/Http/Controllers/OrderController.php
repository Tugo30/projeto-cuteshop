<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Services\CheckoutService;
use Illuminate\Http\Request;

class OrderController extends Controller
{

    public function __construct(private CheckoutService $checkout) {}

    public function myOrders(Request $request)
    {
        $orders = Order::where('user_id', $request->user()->id)
            ->with('items')
            ->latest()
            ->get()
            ->map(fn($o) => [
                'code' => $o->code,
                'status' => $o->status,
                'total' => $o->total_cents / 100,
                'created_at' => $o->created_at,
                'items' => $o->items->map(fn($i) => [
                    'tracking_code' => $o->tracking_code,
                    'name' => $i->product_name,
                    'size' => $i->variant_size,
                    'quantity' => $i->quantity,
                    'image' => $i->product_image
                ]),
            ]);

        return response()->json($orders);
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
