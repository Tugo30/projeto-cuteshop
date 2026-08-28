<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Services\CheckoutService;
use Illuminate\Http\Request;

class OrderController extends Controller
{
    public function __construct(private CheckoutService $checkout) {}

    public function index(Request $request)
    {
        $query = Order::with(['items', 'payment'])->latest();

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        return response()->json($query->paginate(20));
    }

    public function show(string $code)
    {
        return response()->json(
            Order::with(['items', 'payments', 'user'])->where('code', $code)->firstOrFail()
        );
    }

    /** Confirmação manual — enquanto não tem PSP integrado */
    public function confirmPayment(string $code)
    {
        $order   = Order::where('code', $code)->firstOrFail();
        $payment = $order->payments()->where('status', 'pending')->latest()->firstOrFail();

        return response()->json(
            $this->checkout->confirmPayment($payment, ['confirmed_by' => 'admin_manual'])
        );
    }

    public function updateStatus(Request $request, string $code)
    {
        $data = $request->validate([
            'status' => 'required|in:pending,paid,shipped,delivered,canceled,expired,refunded',
        ]);

        $order = Order::where('code', $code)->firstOrFail();
        $order->update(['status' => $data['status']]);

        return response()->json($order->fresh());
    }

    public function page()
    {
        return view('admin.orders');
    }

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
                    'name' => $i->product_name,
                    'size' => $i->variant_size,
                    'quantity' => $i->quantity,
                    'image' => $i->product_image
                ]),
            ]);

        return response()->json($orders);
    }
}
