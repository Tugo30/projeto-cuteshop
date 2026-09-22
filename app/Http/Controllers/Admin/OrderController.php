<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Services\CheckoutService;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use App\Services\OrderStatusService;

class OrderController extends Controller
{
    private const STATUSES = ['pending', 'paid', 'preparing', 'shipped', 'delivered', 'canceled', 'expired'];

    public function __construct(
        private CheckoutService $checkout,
        private OrderStatusService $statuses,
    ) {}

    public function page()
    {
        return view('admin.orders');
    }

    public function index(Request $request)
    {
        $query = Order::query()->with(['items', 'user'])->latest();

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('search')) {
            $term = $request->search;
            $query->where(function ($q) use ($term) {
                $q->where('code', 'like', "%{$term}%")
                    ->orWhere('customer_name', 'like', "%{$term}%")
                    ->orWhere('customer_email', 'like', "%{$term}%")
                    ->orWhere('tracking_code', 'like', "%{$term}%");
            });
        }

        $perPage = min(50, max(10, (int) $request->get('per_page', 15)));

        return $query->paginate($perPage)->through(fn(Order $o) => $this->present($o));
    }

    public function show(string $code)
    {
        $order = Order::with(['items', 'payment', 'user'])->where('code', $code)->firstOrFail();

        return response()->json($this->present($order, detailed: true));
    }

    public function confirmPayment(string $code)
    {
        abort_unless(auth()->user()?->isAdmin(), 403);

        $order = Order::with('payment')->where('code', $code)->firstOrFail();

        if ($order->status !== 'pending' || ! $order->payment) {
            return response()->json(['message' => 'Este pedido não pode ser confirmado.'], 422);
        }

        $this->checkout->confirmPayment($order->payment);

        $order->refresh();

        if (! $order->statusEvents()->where('status', 'paid')->exists()) {
            $this->statuses->record($order, 'paid', 'admin', 'Pagamento confirmado manualmente.');
        }

        return response()->json($this->present($order->fresh(['items', 'payment', 'user']), detailed: true));
    }

    public function updateStatus(Request $request, string $code)
    {
        abort_unless(auth()->user()?->isAdmin(), 403);
        $data = $request->validate([
            'status' => ['required', Rule::in(array_keys(OrderStatusService::LABELS))],
            'force'  => ['sometimes', 'boolean'],
        ]);

        $order = Order::where('code', $code)->firstOrFail();

        $this->statuses->transition(
            order: $order,
            to: $data['status'],
            source: 'admin',
            description: 'Status alterado manualmente pelo painel.',
            force: (bool) ($data['force'] ?? false),
        );

        // if (! $this->canTransition($order->status, $data['status'])) {
        //     return response()->json([
        //         'message' => "Não é possível ir de {$order->status} para {$data['status']}.",
        //     ], 422);
        // }

        // $payload = ['status' => $data['status']];

        // if ($data['status'] === 'shipped' && ! $order->shipped_at) {
        //     $payload['shipped_at'] = now();
        // }

        // $order->update($payload);

        return response()->json($this->present($order->fresh(['items', 'payment', 'user']), detailed: true));
    }

    public function updateTracking(Request $request, string $code)
    {
        abort_unless(auth()->user()?->isAdmin(), 403);
        $data = $request->validate([
            'tracking_code' => ['required', 'string', 'max:80'],
        ]);

        $order = Order::where('code', $code)->firstOrFail();

        if (! in_array($order->status, ['paid', 'preparing', 'shipped'], true)) {
            return response()->json(['message' => 'Só pedidos pagos recebem rastreio.'], 422);
        }

        $order->update(['tracking_code' => $data['tracking_code']]);

        if (in_array($order->status, ['paid', 'preparing'], true)) {
            $this->statuses->transition(
                $order,
                'shipped',
                'admin',
                description: "Rastreio informado: {$data['tracking_code']}",
            );
        }

        return response()->json($this->present($order->fresh(['items', 'payment', 'user']), detailed: true));
    }

    private function canTransition(string $from, string $to): bool
    {
        if ($from === $to) {
            return true;
        }

        $map = [
            'pending'   => ['canceled', 'expired'],
            'paid'      => ['preparing', 'shipped', 'canceled'],
            'preparing' => ['shipped', 'canceled'],
            'shipped'   => ['delivered'],
            'delivered' => [],
            'canceled'  => [],
            'expired'   => [],
        ];

        return in_array($to, $map[$from] ?? [], true);
    }

    private function present(Order $o, bool $detailed = false): array
    {
        $base = [
            'code'           => $o->code,
            'status'         => $o->status,
            'customer_name'  => $o->customer_name,
            'customer_email' => $o->customer_email,
            'total'          => $o->total_cents / 100,
            'total_cents'    => $o->total_cents,
            'tracking_code'  => $o->tracking_code,
            'created_at'     => $o->created_at,
            'paid_at'        => $o->paid_at,
            'shipped_at'     => $o->shipped_at,
            'items_count'    => $o->items->sum('quantity'),
        ];

        if (! $detailed) {
            return $base;
        }

        return $base + [
            'customer_phone'    => $o->customer_phone,
            'customer_document' => $o->customer_document,
            'shipping_service'  => $o->shipping_service,
            'shipping'          => $o->shipping_cents / 100,
            'discount'          => $o->discount_cents / 100,
            'subtotal'          => $o->subtotal_cents / 100,
            'ship_zipcode'      => $o->ship_zipcode,
            'ship_street'       => $o->ship_street,
            'ship_number'       => $o->ship_number,
            'ship_complement'   => $o->ship_complement,
            'ship_district'     => $o->ship_district,
            'ship_city'         => $o->ship_city,
            'ship_state'        => $o->ship_state,
            'items'             => $o->items->map(fn($i) => [
                'name'     => $i->product_name,
                'size'     => $i->variant_size,
                'quantity' => $i->quantity,
                'image'    => $i->product_image
                    ? (str_starts_with($i->product_image, 'http') || str_starts_with($i->product_image, '/')
                        ? $i->product_image
                        : '/storage/' . $i->product_image)
                    : null,
                'total'    => $i->total_cents / 100,
            ]),
            'progress' => app(OrderStatusService::class)->progress($o),
            'user' => $o->user ? [
                'id'         => $o->user->id,
                'username'   => $o->user->username ?? $o->user->name,
                'email'      => $o->user->email,
                'role_id'    => $o->user->role_id,
                'created_at' => $o->user->created_at,
            ] : null,
            'user_stats' => $o->user ? [
                'orders_count' => $o->user->orders()->count(),
                'orders_total' => round($o->user->orders()->whereIn('status', ['paid', 'preparing', 'shipped', 'delivered'])->sum('total_cents') / 100, 2),
                'last_order_at' => $o->user->orders()->latest()->value('created_at'),
            ] : null,
        ];
    }
}
