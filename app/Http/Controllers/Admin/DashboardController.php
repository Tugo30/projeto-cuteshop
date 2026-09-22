<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\OrderItem;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class DashboardController extends Controller
{
    private const PAID_STATUSES = ['paid', 'preparing', 'shipped', 'delivered'];

    public function page()
    {
        abort_unless(auth()->user()?->isAdmin(), 403);

        return view('admin.dashboard');
    }

    public function metrics(Request $request)
    {
        abort_unless(auth()->user()?->isAdmin(), 403);

        $data = $request->validate([
            'period' => ['nullable', Rule::in(['mes', '30d', 'ano', 'tudo'])],
        ]);

        $period = $data['period'] ?? 'mes';

        [$start, $end, $prevStart, $prevEnd] = $this->range($period);

        $atual = $this->aggregate(self::PAID_STATUSES, $start, $end);
        $anterior = $this->aggregate(self::PAID_STATUSES, $prevStart, $prevEnd);

        return response()->json([
            'period'                    => $period,
            'vendas_mes_cents'          => $atual['vendas_cents'],
            'vendas_anterior_cents'     => $anterior['vendas_cents'],
            'variacao_vendas'           => $this->variation($atual['vendas_cents'], $anterior['vendas_cents']),
            'qtd_pedidos_mes'           => $atual['qtd'],
            'qtd_pedidos_anterior'      => $anterior['qtd'],
            'variacao_pedidos'          => $this->variation($atual['qtd'], $anterior['qtd']),
            'ticket_medio_cents'        => $atual['ticket_cents'],
            'ticket_medio_anterior_cents' => $anterior['ticket_cents'],
            'variacao_ticket'           => $this->variation($atual['ticket_cents'], $anterior['ticket_cents']),
            'pedidos_pendentes'         => Order::where('status', 'pending')->count(),
            'clientes_unicos'           => $this->uniqueCustomers($start, $end),
            'serie_diaria'              => $this->dailySeries($start, $end),
            'mais_vendidos'             => $this->bestSellers($start, $end),
        ]);
    }

    /**
     * Retorna [início, fim(exclusivo), início anterior, fim anterior(exclusivo)].
     */
    private function range(string $period): array
    {
        $now = now();

        switch ($period) {
            case '30d':
                $start = $now->copy()->subDays(29)->startOfDay();
                $end = $now->copy()->addDay()->startOfDay();
                $prevStart = $start->copy()->subDays(30);
                $prevEnd = $start->copy();
                break;

            case 'ano':
                $start = $now->copy()->startOfYear();
                $end = $now->copy()->addDay()->startOfDay();
                $prevStart = $start->copy()->subYear();
                $prevEnd = $end->copy()->subYear();
                break;

            case 'tudo':
                return [null, null, null, null];

            case 'mes':
            default:
                $start = $now->copy()->startOfMonth();
                $end = $now->copy()->addDay()->startOfDay();
                $prevStart = $start->copy()->subMonthNoOverflow()->startOfMonth();
                $prevEnd = $start->copy();
                break;
        }

        return [$start, $end, $prevStart, $prevEnd];
    }

    private function aggregate(array $statuses, ?Carbon $start, ?Carbon $end): array
    {
        $query = Order::query()->whereIn('status', $statuses);

        if ($start) {
            $query->where('paid_at', '>=', $start);
        }
        if ($end) {
            $query->where('paid_at', '<', $end);
        }

        $row = $query->selectRaw('COUNT(*) as qtd, COALESCE(SUM(total_cents), 0) as vendas')->first();

        $qtd = (int) $row->qtd;
        $vendas = (int) $row->vendas;

        return [
            'vendas_cents' => $vendas,
            'qtd'          => $qtd,
            'ticket_cents' => $qtd > 0 ? (int) round($vendas / $qtd) : 0,
        ];
    }

    private function uniqueCustomers(?Carbon $start, ?Carbon $end): int
    {
        $query = Order::query()
            ->whereIn('status', self::PAID_STATUSES)
            ->whereNotNull('user_id');

        if ($start) {
            $query->where('paid_at', '>=', $start);
        }
        if ($end) {
            $query->where('paid_at', '<', $end);
        }

        return (int) $query->distinct('user_id')->count('user_id');
    }

    private function dailySeries(?Carbon $start, ?Carbon $end): array
    {
        $query = Order::query()
            ->whereIn('status', self::PAID_STATUSES)
            ->whereNotNull('paid_at');

        if ($start) {
            $query->where('paid_at', '>=', $start);
        }
        if ($end) {
            $query->where('paid_at', '<', $end);
        }

        return $query
            ->selectRaw('DATE(paid_at) as dia, COUNT(*) as pedidos, COALESCE(SUM(total_cents), 0) as total_cents')
            ->groupBy('dia')
            ->orderBy('dia')
            ->get()
            ->map(fn ($r) => [
                'dia'         => (string) $r->dia,
                'pedidos'     => (int) $r->pedidos,
                'total_cents' => (int) $r->total_cents,
            ])
            ->all();
    }

    private function bestSellers(?Carbon $start, ?Carbon $end): array
    {
        $query = OrderItem::query()
            ->join('orders', 'orders.id', '=', 'order_items.order_id')
            ->whereIn('orders.status', self::PAID_STATUSES);

        if ($start) {
            $query->where('orders.paid_at', '>=', $start);
        }
        if ($end) {
            $query->where('orders.paid_at', '<', $end);
        }

        return $query
            ->groupBy('order_items.product_id')
            ->selectRaw('
                order_items.product_id as product_id,
                MAX(order_items.product_name) as name,
                SUM(order_items.quantity) as quantity,
                SUM(order_items.total_cents) as revenue_cents
            ')
            ->orderByDesc('quantity')
            ->limit(5)
            ->get()
            ->map(fn ($r) => [
                'product_id'    => $r->product_id,
                'name'          => $r->name,
                'quantity'      => (int) $r->quantity,
                'revenue_cents' => (int) $r->revenue_cents,
            ])
            ->all();
    }

    private function variation(int $atual, int $anterior): ?float
    {
        if ($anterior === 0) {
            return $atual > 0 ? 100.0 : null;
        }

        return round((($atual - $anterior) / $anterior) * 100, 1);
    }
}
