import { useState, useEffect } from "react"
import axios from "axios"

const csrf = () => document.querySelector("meta[name='csrf-token']")?.content
const brl = (v) => Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })

const STATUS = {
    pending: { label: "Aguardando Pix", cls: "bg-amber-50 text-amber-800 border-amber-200" },
    paid: { label: "Pago", cls: "bg-emerald-50 text-emerald-800 border-emerald-200" },
    preparing: { label: "Preparando", cls: "bg-sky-50 text-sky-800 border-sky-200" },
    shipped: { label: "Enviado", cls: "bg-blue-50 text-blue-800 border-blue-200" },
    delivered: { label: "Entregue", cls: "bg-emerald-50 text-emerald-800 border-emerald-200" },
    canceled: { label: "Cancelado", cls: "bg-red-50 text-red-800 border-red-200" },
    expired: { label: "Expirado", cls: "bg-red-50 text-red-800 border-red-200" },
    refunded: { label: "Reembolsado", cls: "bg-neutral-100 text-neutral-600 border-neutral-200" },
}

const NEXT = {
    pending: ["paid", "canceled", "expired"],
    paid: ["preparing", "shipped", "canceled", "refunded"],
    preparing: ["shipped", "canceled", "refunded"],
    shipped: ["delivered", "canceled"],
    delivered: ["refunded"],
    expired: ["paid"],
}

export default function AdminOrdersList() {
    const [orders, setOrders] = useState([])
    const [meta, setMeta] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")
    const [status, setStatus] = useState("")
    const [search, setSearch] = useState("")
    const [page, setPage] = useState(1)
    const [selected, setSelected] = useState(null)
    const [tracking, setTracking] = useState("")
    const [busy, setBusy] = useState(false)

    const headers = { "X-CSRF-TOKEN": csrf() }

    async function fetchOrders(p = page) {
        setLoading(true)
        try {
            const res = await axios.get("/api/admin/pedidos", { params: { status: status || undefined, search: search || undefined, page: p } })
            setOrders(res.data.data ?? [])
            setMeta(res.data)
        } catch {
            setError("Erro ao carregar pedidos.")
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { fetchOrders(1); setPage(1) }, [status])

    useEffect(() => {
        if (!selected) return
        const onKey = (e) => e.key === "Escape" && setSelected(null)
        window.addEventListener("keydown", onKey)
        return () => window.removeEventListener("keydown", onKey)
    }, [selected])

    async function openOrder(code) {
        const res = await axios.get(`/api/admin/pedidos/${code}`)
        setSelected(res.data)
        setTracking(res.data.tracking_code ?? "")
    }

    async function confirmPay(code) {
        setBusy(true)
        try {
            const res = await axios.post(`/api/admin/pedidos/${code}/confirmar-pagamento`, {}, { headers })
            setSelected(res.data)
            fetchOrders()
        } catch (e) {
            alert(e.response?.data?.message ?? "Não foi possível confirmar.")
        } finally {
            setBusy(false)
        }
    }

    async function changeStatus(code, next) {
        setBusy(true)
        try {
            const res = await axios.put(`/api/admin/pedidos/${code}/status`, { status: next }, { headers })
            setSelected(res.data)
            fetchOrders()
        } catch (e) {
            alert(e.response?.data?.message ?? "Transição inválida.")
        } finally {
            setBusy(false)
        }
    }

    async function saveTracking(code) {
        if (!tracking.trim()) return
        setBusy(true)
        try {
            const res = await axios.put(`/api/admin/pedidos/${code}/rastreio`, { tracking_code: tracking.trim() }, { headers })
            setSelected(res.data)
            fetchOrders()
        } catch (e) {
            alert(e.response?.data?.message ?? "Erro ao salvar rastreio.")
        } finally {
            setBusy(false)
        }
    }

    const st = (s) => STATUS[s] ?? { label: s, cls: "bg-neutral-100 text-neutral-600 border-neutral-200" }
    const initials = (name) => (name || "?").trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase()).join("")

    return (
        <div className="mx-auto w-full max-w-5xl space-y-8">
            <nav className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-gray-400">
                <a href="/admin/dashboard" className="hover:text-ink transition-colors">Painel</a>
                <span className="text-gray-300">/</span>
                <span className="text-ink">Pedidos</span>
            </nav>

            <div className="flex items-baseline justify-between gap-4 border-b border-border pb-5">
                <div>
                    <h1 className="text-3xl font-display italic text-ink m-0">Pedidos</h1>
                    <p className="text-sm text-gray-500 mt-1 m-0">Acompanhe pagamento, preparo e envio</p>
                </div>
                {meta?.total != null && (
                    <p className="text-sm text-gray-400 font-mono m-0">{meta.total} no total</p>
                )}
            </div>

            <div className="flex flex-wrap items-end gap-6">
                <div className="flex-1 min-w-[220px]">
                    <label className="block text-[11px] text-gray-400 mb-1">Buscar</label>
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && fetchOrders(1)}
                        placeholder="Código, nome, e-mail ou rastreio"
                        className="w-full border-0 border-b border-border pb-2 text-sm bg-transparent outline-none focus:border-primary transition-colors"
                    />
                </div>
                <div className="min-w-[170px]">
                    <label className="block text-[11px] text-gray-400 mb-1">Status</label>
                    <select
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                        className="w-full border-0 border-b border-border pb-2 text-sm bg-transparent outline-none focus:border-primary transition-colors"
                    >
                        <option value="">Todos</option>
                        {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                    </select>
                </div>
                <button
                    type="button"
                    onClick={() => fetchOrders(1)}
                    className="pb-2 text-sm text-ink border-b border-ink hover:text-primary hover:border-primary transition-colors"
                >
                    Buscar
                </button>
            </div>

            {error && <p className="text-sm text-red-700">{error}</p>}

            {loading ? (
                <p className="text-sm text-gray-400 py-14 text-center italic font-display">Carregando pedidos…</p>
            ) : orders.length === 0 ? (
                <p className="text-sm text-gray-400 py-14 text-center italic font-display">Nenhum pedido encontrado.</p>
            ) : (
                <ul className="list-none m-0 p-0 divide-y divide-border">
                    {orders.map((o) => {
                        const s = st(o.status)
                        return (
                            <li key={o.code}>
                                <button
                                    type="button"
                                    onClick={() => openOrder(o.code)}
                                    className="w-full text-left py-5 flex flex-wrap items-center justify-between gap-4 group outline-none focus-visible:ring-2 focus-visible:ring-black/10"
                                >
                                    <div className="flex items-center gap-4">
                                        <span className="w-9 h-9 flex items-center justify-center bg-[#FAFAF8] border border-border text-[11px] font-mono text-gray-500 shrink-0">
                                            {initials(o.customer_name)}
                                        </span>
                                        <div>
                                            <p className="m-0 text-[15px] text-ink group-hover:text-primary transition-colors">{o.customer_name}</p>
                                            <p className="m-0 mt-0.5 font-mono text-[11px] text-gray-400">{o.code}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-5">
                                        <span className={`text-[11px] px-2.5 py-1 border rounded-full ${s.cls}`}>{s.label}</span>
                                        <span className="font-display italic text-base text-ink w-24 text-right">{brl(o.total ?? o.total_cents / 100)}</span>
                                    </div>
                                </button>
                            </li>
                        )
                    })}
                </ul>
            )}

            {meta?.last_page > 1 && (
                <div className="flex items-center gap-4 text-sm text-gray-500 pt-2">
                    <button type="button" disabled={page <= 1} onClick={() => { const p = page - 1; setPage(p); fetchOrders(p) }} className="disabled:opacity-30 hover:text-ink transition-colors">← Anterior</button>
                    <span className="font-mono text-[11px]">{page} / {meta.last_page}</span>
                    <button type="button" disabled={page >= meta.last_page} onClick={() => { const p = page + 1; setPage(p); fetchOrders(p) }} className="disabled:opacity-30 hover:text-ink transition-colors">Próxima →</button>
                </div>
            )}

            {selected && (
                <div
                    className="fixed inset-0 z-[1100] bg-black/40 flex items-center justify-center p-4"
                    onClick={() => setSelected(null)}
                >
                    <aside
                        className="w-full max-w-2xl max-h-[90vh] bg-white overflow-y-auto shadow-2xl rounded-lg"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="sticky top-0 bg-white z-10 p-8 border-b border-border">
                            <div className="flex justify-between items-start gap-4">
                                <div>
                                    <button
                                        type="button"
                                        onClick={() => setSelected(null)}
                                        className="text-[11px] text-gray-400 hover:text-ink transition-colors m-0 mb-2 inline-flex items-center gap-1"
                                    >
                                        ← Voltar para pedidos
                                    </button>
                                    <p className="text-[11px] text-gray-400 m-0">Pedido {selected.code}</p>
                                </div>
                                <button type="button" onClick={() => setSelected(null)} className="text-sm text-gray-400 hover:text-ink transition-colors">
                                    Fechar
                                </button>
                            </div>
                            <p className="font-display italic text-4xl text-ink m-0 mt-2">{brl(selected.total)}</p>
                            <span className={`inline-block text-[11px] px-2.5 py-1 border rounded-full mt-3 ${st(selected.status).cls}`}>
                                {st(selected.status).label}
                            </span>
                        </div>

                        <div className="p-8 border-b border-border">
                            <p className="text-[11px] text-gray-400 uppercase tracking-wider m-0 mb-3">Dados do checkout</p>
                            <p className="text-[15px] text-ink m-0">{selected.customer_name}</p>
                            <p className="text-sm text-gray-500 m-0 mt-0.5">{selected.customer_email}</p>
                            {selected.customer_phone && <p className="text-sm text-gray-500 m-0">{selected.customer_phone}</p>}
                            <p className="text-sm text-gray-500 mt-3 leading-relaxed">
                                {selected.ship_street}, {selected.ship_number}{selected.ship_complement ? ` — ${selected.ship_complement}` : ""}
                                <br />
                                {selected.ship_district}, {selected.ship_city}/{selected.ship_state}
                                <br />
                                CEP {selected.ship_zipcode}
                            </p>
                        </div>

                        <div className="p-8 border-b border-border">
                            <p className="text-[11px] text-gray-400 uppercase tracking-wider m-0 mb-3">Conta do cliente</p>

                            {selected.user ? (
                                <>
                                    <p className="text-[15px] text-ink m-0">{selected.user.username}</p>
                                    <p className="text-sm text-gray-500 m-0 mt-0.5">{selected.user.email}</p>
                                    {selected.user.id && (
                                        <p className="text-xs text-gray-400 font-mono m-0 mt-0.5">usuário #{selected.user.id}</p>
                                    )}

                                    {selected.user_stats && (
                                        <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-gray-500">
                                            <span><strong className="text-ink">{selected.user_stats.orders_count}</strong> pedidos</span>
                                            <span><strong className="text-ink">{brl(selected.user_stats.orders_total)}</strong> em compras</span>
                                            {selected.user_stats.last_order_at && (
                                                <span>Último: {new Date(selected.user_stats.last_order_at).toLocaleDateString("pt-BR")}</span>
                                            )}
                                        </div>
                                    )}
                                </>
                            ) : (
                                <p className="text-sm text-gray-400 m-0">Pedido de visitante — sem conta cadastrada.</p>
                            )}
                        </div>

                        <ul className="list-none m-0 p-0 border-b border-border">
                            {(selected.items ?? []).map((i, idx) => (
                                <li key={idx} className="flex justify-between gap-3 px-8 py-4 border-b border-border last:border-b-0 text-sm">
                                    <span className="text-ink">{i.quantity}× {i.name}{i.size ? <span className="text-gray-400"> · tam {i.size}</span> : ""}</span>
                                    <span className="font-mono text-gray-600">{brl(i.total)}</span>
                                </li>
                            ))}
                        </ul>

                        <div className="p-8 space-y-5">
                            {selected.status === "pending" && (
                                <button
                                    type="button"
                                    disabled={busy}
                                    onClick={() => confirmPay(selected.code)}
                                    className="w-full py-3 bg-primary text-white text-sm tracking-wide hover:opacity-90 transition-opacity disabled:opacity-50"
                                >
                                    Confirmar pagamento recebido
                                </button>
                            )}

                            {(NEXT[selected.status] ?? []).length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                    {NEXT[selected.status].map((n) => (
                                        <button
                                            key={n}
                                            type="button"
                                            disabled={busy}
                                            onClick={() => changeStatus(selected.code, n)}
                                            className="px-3 py-2 border border-border text-ink text-xs hover:border-primary hover:text-primary transition-colors"
                                        >
                                            Marcar como {st(n).label.toLowerCase()}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {["paid", "preparing", "shipped"].includes(selected.status) && (
                                <div>
                                    <label className="block text-[11px] text-gray-400 mb-1.5">Código de rastreio</label>
                                    <div className="flex gap-3 items-end">
                                        <input
                                            value={tracking}
                                            onChange={(e) => setTracking(e.target.value)}
                                            className="flex-1 border-0 border-b border-border pb-2 text-sm bg-transparent outline-none focus:border-primary transition-colors"
                                            placeholder="Digite o código"
                                        />
                                        <button
                                            type="button"
                                            disabled={busy || !tracking.trim()}
                                            onClick={() => saveTracking(selected.code)}
                                            className="pb-2 text-sm text-ink border-b border-ink hover:text-primary hover:border-primary transition-colors disabled:opacity-30"
                                        >
                                            Salvar
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </aside>
                </div>
            )}
        </div>
    )
}
