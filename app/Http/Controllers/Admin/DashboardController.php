<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\OrderItem;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    public function page()
    {
        return view('admin.dashboard');
    }

    public function metrics()
    {
        $inicioMes = now()->startOfMonth();
        $fimMes    = now()->endOfMonth();

        $pedidosPagosNoMes = Order::whereIn('status', ['paid', 'shipped', 'delivered'])
            ->whereBetween('paid_at', [$inicioMes, $fimMes]);

        $vendasNoMes = (clone $pedidosPagosNoMes)->sum('total_cents');
        $qtdPedidosNoMes = (clone $pedidosPagosNoMes)->count();

        $ticketMedio = $qtdPedidosNoMes > 0
            ? (int) round($vendasNoMes / $qtdPedidosNoMes)
            : 0;

        $maisVendidos = OrderItem::select('product_name', DB::raw('SUM(quantity) as total_vendido'))
            ->whereHas('order', function ($q) use ($inicioMes, $fimMes) {
                $q->whereIn('status', ['paid', 'shipped', 'delivered'])
                  ->whereBetween('paid_at', [$inicioMes, $fimMes]);
            })
            ->groupBy('product_name')
            ->orderByDesc('total_vendido')
            ->limit(5)
            ->get();

        $pedidosPendentes = Order::where('status', 'pending')->count();

        return response()->json([
            'vendas_mes_cents'   => $vendasNoMes,
            'qtd_pedidos_mes'    => $qtdPedidosNoMes,
            'ticket_medio_cents' => $ticketMedio,
            'pedidos_pendentes'  => $pedidosPendentes,
            'mais_vendidos'      => $maisVendidos,
        ]);
    }
}