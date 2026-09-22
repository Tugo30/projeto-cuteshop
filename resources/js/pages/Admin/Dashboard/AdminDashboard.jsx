import { useCallback, useEffect, useMemo, useState } from "react"
import axios from "axios"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
    RefreshCw,
    AlertTriangle,
    TrendingUp,
    TrendingDown,
    Minus,
    ShoppingBag,
    Receipt,
    DollarSign,
    Clock,
    Users,
    Package,
    BarChart3,
} from "lucide-react"

const ACCENT = "#3D5A6C"
const INK = "#16161A"
const BORDER = "#E4E2DC"
const MUTED = "#737373"

const PERIODS = [
    { value: "mes", label: "Este mês" },
    { value: "30d", label: "30 dias" },
    { value: "ano", label: "Este ano" },
    { value: "tudo", label: "Tudo" },
]

const brl = (cents) =>
    Number(cents || 0).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
    })

const compactBrl = (cents) =>
    Number(cents || 0).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
        notation: "compact",
        maximumFractionDigits: 1,
    })

function apiError(err, fallback) {
    return (
        err.response?.data?.message ??
        Object.values(err.response?.data?.errors ?? {})[0]?.[0] ??
        fallback
    )
}

function Variation({ value }) {
    if (value === null || value === undefined) {
        return (
            <span className="inline-flex items-center gap-1 text-xs" style={{ color: MUTED }}>
                <Minus className="h-3 w-3" /> sem base
            </span>
        )
    }
    const positive = value >= 0
    return (
        <span
            className="inline-flex items-center gap-1 text-xs font-medium"
            style={{ color: positive ? "#047857" : "#b91c1c" }}
        >
            {positive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {positive ? "+" : ""}
            {value.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%
            <span style={{ color: MUTED, fontWeight: 400 }}>vs. anterior</span>
        </span>
    )
}

function Kpi({ icon: Icon, label, value, variation, hint }) {
    return (
        <Card className="border shadow-sm" style={{ borderColor: BORDER }}>
            <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <p
                            className="text-[11px] font-semibold uppercase tracking-wider"
                            style={{ color: MUTED, fontFamily: "'IBM Plex Mono', monospace" }}
                        >
                            {label}
                        </p>
                        <p
                            className="mt-2 truncate text-2xl font-bold"
                            style={{ color: INK, fontFamily: "'Fraunces', serif" }}
                        >
                            {value}
                        </p>
                    </div>
                    <span
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
                        style={{ backgroundColor: `${ACCENT}14`, color: ACCENT }}
                        aria-hidden="true"
                    >
                        <Icon className="h-5 w-5" />
                    </span>
                </div>
                <div className="mt-3">{variation}</div>
                {hint && (
                    <p className="mt-1 text-xs" style={{ color: MUTED }}>
                        {hint}
                    </p>
                )}
            </CardContent>
        </Card>
    )
}

function SkeletonKpis() {
    return (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
                <Card key={i} className="border shadow-sm" style={{ borderColor: BORDER }}>
                    <CardContent className="animate-pulse space-y-3 p-5">
                        <div className="h-3 w-24 rounded bg-neutral-100" />
                        <div className="h-7 w-32 rounded bg-neutral-100" />
                        <div className="h-3 w-20 rounded bg-neutral-100" />
                    </CardContent>
                </Card>
            ))}
        </div>
    )
}

function DailyChart({ data }) {
    const max = useMemo(
        () => Math.max(1, ...data.map((d) => d.total_cents)),
        [data]
    )

    if (!data.length) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-center">
                <BarChart3 className="mb-3 h-8 w-8 text-neutral-300" />
                <p className="text-sm font-medium text-neutral-600">
                    Sem vendas pagas neste período
                </p>
            </div>
        )
    }

    return (
        <div>
            <div
                className="flex h-44 items-stretch gap-1.5 overflow-x-auto"
                role="img"
                aria-label={`Gráfico de vendas por dia: ${data.length} dias com venda`}
            >
                {data.map((d) => {
                    const pct = Math.max(4, Math.round((d.total_cents / max) * 100))
                    const [, mes, dia] = d.dia.split("-")
                    return (
                        <div
                            key={d.dia}
                            className="group relative flex h-full flex-col items-center justify-end"
                            style={{ minWidth: 18, flex: "1 0 auto" }}
                            title={`${dia}/${mes} — ${brl(d.total_cents)} · ${d.pedidos} pedido(s)`}
                        >
                            <span className="mb-1 hidden text-[10px] text-neutral-500 group-hover:block">
                                {compactBrl(d.total_cents)}
                            </span>
                            <div
                                className="w-full rounded-t transition-all group-hover:opacity-80"
                                style={{ height: `${pct}%`, backgroundColor: ACCENT }}
                            />
                        </div>
                    )
                })}
            </div>
            <div className="mt-2 flex justify-between text-[10px] text-neutral-400">
                <span>{data[0]?.dia?.split("-").reverse().join("/")}</span>
                <span>{data[data.length - 1]?.dia?.split("-").reverse().join("/")}</span>
            </div>
        </div>
    )
}

function BestSellers({ items }) {
    if (!items.length) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-center">
                <Package className="mb-3 h-8 w-8 text-neutral-300" />
                <p className="text-sm font-medium text-neutral-600">
                    Nenhum produto vendido neste período
                </p>
            </div>
        )
    }

    const top = items[0]?.quantity || 1

    return (
        <ul className="m-0 list-none divide-y p-0" style={{ borderColor: BORDER }}>
            {items.map((p, i) => (
                <li key={`${p.product_id}-${i}`} className="flex items-center gap-3 py-3">
                    <span
                        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-xs font-semibold"
                        style={{ backgroundColor: `${ACCENT}14`, color: ACCENT, fontFamily: "'IBM Plex Mono', monospace" }}
                    >
                        {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium" style={{ color: INK }}>
                            {p.name}
                        </p>
                        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-neutral-100">
                            <div
                                className="h-full rounded-full"
                                style={{ width: `${Math.round((p.quantity / top) * 100)}%`, backgroundColor: ACCENT }}
                            />
                        </div>
                    </div>
                    <div className="shrink-0 text-right">
                        <p className="text-sm font-semibold" style={{ color: INK }}>
                            {p.quantity} un.
                        </p>
                        <p className="text-xs" style={{ color: MUTED }}>
                            {brl(p.revenue_cents)}
                        </p>
                    </div>
                </li>
            ))}
        </ul>
    )
}

export default function AdminDashboard() {
    const [period, setPeriod] = useState("mes")
    const [data, setData] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    const load = useCallback(async (p) => {
        setLoading(true)
        setError(null)
        try {
            const res = await axios.get("/api/admin/metricas", { params: { period: p } })
            setData(res.data)
        } catch (err) {
            setError(
                err.response?.status === 403
                    ? "Você não tem permissão para ver as métricas."
                    : apiError(err, "Não foi possível carregar as métricas agora.")
            )
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        load(period)
    }, [period, load])

    return (
        <div
            className="mx-auto w-full max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8"
            style={{ fontFamily: "'Inter', sans-serif" }}
        >
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                    <h1
                        className="text-xl font-semibold"
                        style={{ fontFamily: "'Fraunces', serif", color: INK }}
                    >
                        Dashboard
                    </h1>
                    <p className="mt-1 text-sm" style={{ color: MUTED }}>
                        Visão geral das vendas e do movimento da loja.
                    </p>
                </div>

                <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
                    <div
                        className="inline-flex w-full overflow-x-auto rounded-md border p-0.5 sm:w-auto"
                        style={{ borderColor: BORDER }}
                        role="group"
                        aria-label="Filtrar por período"
                    >
                        {PERIODS.map((opt) => {
                            const active = period === opt.value
                            return (
                                <button
                                    key={opt.value}
                                    type="button"
                                    aria-pressed={active}
                                    onClick={() => setPeriod(opt.value)}
                                    className="rounded px-3 py-1.5 text-xs font-medium outline-none transition-colors focus-visible:ring-2"
                                    style={{
                                        backgroundColor: active ? ACCENT : "transparent",
                                        color: active ? "#ffffff" : MUTED,
                                        "--tw-ring-color": `${ACCENT}4D`,
                                    }}
                                >
                                    {opt.label}
                                </button>
                            )
                        })}
                    </div>

                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => load(period)}
                        disabled={loading}
                        aria-label="Atualizar métricas"
                    >
                        <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                        Atualizar
                    </Button>
                </div>
            </div>

            {error ? (
                <Card className="border shadow-sm" style={{ borderColor: BORDER }}>
                    <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                        <AlertTriangle className="h-8 w-8 text-rose-400" />
                        <p className="font-medium text-neutral-700">{error}</p>
                        <Button variant="outline" onClick={() => load(period)}>
                            Tentar novamente
                        </Button>
                    </CardContent>
                </Card>
            ) : loading && !data ? (
                <SkeletonKpis />
            ) : (
                <>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <Kpi
                            icon={DollarSign}
                            label="Vendas pagas"
                            value={brl(data?.vendas_mes_cents)}
                            variation={<Variation value={data?.variacao_vendas} />}
                            hint={`Anterior: ${brl(data?.vendas_anterior_cents)}`}
                        />
                        <Kpi
                            icon={Receipt}
                            label="Pedidos pagos"
                            value={data?.qtd_pedidos_mes ?? 0}
                            variation={<Variation value={data?.variacao_pedidos} />}
                            hint={`Anterior: ${data?.qtd_pedidos_anterior ?? 0}`}
                        />
                        <Kpi
                            icon={ShoppingBag}
                            label="Ticket médio"
                            value={brl(data?.ticket_medio_cents)}
                            variation={<Variation value={data?.variacao_ticket} />}
                            hint={`Anterior: ${brl(data?.ticket_medio_anterior_cents)}`}
                        />
                        <Kpi
                            icon={Clock}
                            label="Pix pendentes"
                            value={data?.pedidos_pendentes ?? 0}
                            variation={
                                <span className="inline-flex items-center gap-1 text-xs" style={{ color: MUTED }}>
                                    <Users className="h-3 w-3" />
                                    {data?.clientes_unicos ?? 0} cliente(s) no período
                                </span>
                            }
                            hint="Aguardando pagamento agora"
                        />
                    </div>

                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
                        <Card className="border shadow-sm lg:col-span-3" style={{ borderColor: BORDER }}>
                            <CardHeader className="border-b" style={{ borderColor: BORDER }}>
                                <CardTitle
                                    className="text-base font-semibold"
                                    style={{ fontFamily: "'Fraunces', serif", color: INK }}
                                >
                                    Vendas por dia
                                </CardTitle>
                                <p className="text-xs" style={{ color: MUTED }}>
                                    Total recebido por dia no período selecionado.
                                </p>
                            </CardHeader>
                            <CardContent className="pt-5">
                                <DailyChart data={data?.serie_diaria ?? []} />
                            </CardContent>
                        </Card>

                        <Card className="border shadow-sm lg:col-span-2" style={{ borderColor: BORDER }}>
                            <CardHeader className="border-b" style={{ borderColor: BORDER }}>
                                <CardTitle
                                    className="text-base font-semibold"
                                    style={{ fontFamily: "'Fraunces', serif", color: INK }}
                                >
                                    Mais vendidos
                                </CardTitle>
                                <p className="text-xs" style={{ color: MUTED }}>
                                    Top 5 por quantidade no período.
                                </p>
                            </CardHeader>
                            <CardContent className="pt-2">
                                <BestSellers items={data?.mais_vendidos ?? []} />
                            </CardContent>
                        </Card>
                    </div>
                </>
            )}
        </div>
    )
}