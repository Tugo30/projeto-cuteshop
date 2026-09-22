import { useEffect, useState } from "react"
import Navbar from "../Home/Navbar"
import OrderTimeline from "../../components/OrderTimeline"

const csrf = () => document.querySelector('meta[name="csrf-token"]')?.content
const brl = (v) => Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })

const LABEL = {
    pending: "Aguardando pagamento",
    paid: "Pago",
    preparing: "Preparando",
    shipped: "Enviado",
    delivered: "Entregue",
    canceled: "Cancelado",
    expired: "Expirado",
    refunded: "Reembolsado",
}

export default function MyOrders() {
    const [orders, setOrders] = useState([])
    const [loading, setLoading] = useState(true)
    const [busy, setBusy] = useState(null)
    const [detail, setDetail] = useState(null)
    const [detailLoading, setDetailLoading] = useState(false)

    async function load() {
        setLoading(true)
        try {
            const r = await fetch("/api/meus-pedidos", { credentials: "same-origin", headers: { Accept: "application/json" } })
            if (r.status === 401) {
                window.location.href = "/login"
                return
            }
            setOrders(await r.json())
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { load() }, [])

    async function openDetail(code) {
        if (detail?.code === code) {
            setDetail(null)
            return
        }
        setDetailLoading(true)
        try {
            const r = await fetch(`/api/meus-pedidos/${code}`, { credentials: "same-origin", headers: { Accept: "application/json" } })
            if (r.ok) setDetail(await r.json())
        } finally {
            setDetailLoading(false)
        }
    }

    async function cancel(code) {
        if (!confirm("Cancelar este Pix? Você poderá fazer um pedido novo.")) return
        setBusy(code)
        try {
            const r = await fetch(`/api/meus-pedidos/${code}/cancelar`, {
                method: "POST",
                credentials: "same-origin",
                headers: { Accept: "application/json", "X-CSRF-TOKEN": csrf() },
            })
            const data = await r.json().catch(() => ({}))
            if (!r.ok) {
                alert(data.message ?? "Não foi possível cancelar.")
                return
            }
            setDetail(null)
            await load()
        } finally {
            setBusy(null)
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-[#FAFAF8]">
                <Navbar />
                <p className="py-24 text-center text-[11px] uppercase tracking-[0.2em] text-neutral-400">Carregando pedidos…</p>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-[#FAFAF8]">
            <Navbar />
            <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
                <h1 className="font-display italic text-2xl text-ink">Meus pedidos</h1>
                <p className="mt-2 mb-10 text-xs text-neutral-500">Acompanhe pagamento, envio e rastreio</p>

                {orders.length === 0 ? (
                    <p className="text-sm text-neutral-500">Você ainda não fez pedidos. <a href="/#produtos" className="underline">Ver produtos</a></p>
                ) : (
                    <ul className="m-0 list-none space-y-4 p-0">
                        {orders.map((o) => (
                            <li key={o.code} className={`border bg-white p-5 ${o.can_pay ? "border-neutral-900" : "border-neutral-200"}`}>
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div>
                                        <p className="m-0 font-mono text-[11px] text-ink">{o.code}</p>
                                        <p className="mt-1 mb-0 text-xs text-neutral-500">{LABEL[o.status] ?? o.status}</p>
                                    </div>
                                    <p className="m-0 font-medium">{brl(o.total)}</p>
                                </div>

                                <ul className="mt-4 mb-0 list-none p-0 text-xs text-neutral-600">
                                    {(o.items ?? []).map((i, idx) => (
                                        <li key={idx}>{i.quantity}× {i.name}{i.size ? ` · TAM ${i.size}` : ""}</li>
                                    ))}
                                </ul>

                                {o.tracking_code && (
                                    <p className="mt-3 mb-0 text-xs">Rastreio: <strong>{o.tracking_code}</strong></p>
                                )}

                                <div className="mt-4 flex flex-wrap gap-2">
                                    <button
                                        type="button"
                                        onClick={() => openDetail(o.code)}
                                        className="border border-neutral-300 px-4 py-2 text-[11px] uppercase tracking-widest"
                                    >
                                        {detail?.code === o.code ? "Fechar detalhes" : detailLoading ? "Carregando…" : "Acompanhar pedido"}
                                    </button>

                                    {o.can_pay && (
                                        <a href={o.pay_url || `/checkout/pagamento/${o.code}`} className="bg-neutral-900 px-4 py-2 text-[11px] uppercase tracking-widest text-white no-underline">
                                            Pagar
                                        </a>
                                    )}
                                    {o.can_cancel && (
                                        <button type="button" disabled={busy === o.code} onClick={() => cancel(o.code)} className="border border-neutral-300 px-4 py-2 text-[11px] uppercase tracking-widest">
                                            {busy === o.code ? "Cancelando…" : "Cancelar"}
                                        </button>
                                    )}
                                </div>

                                {detail?.code === o.code && (
                                    <div className="mt-5">
                                        <OrderTimeline progress={detail.progress} />
                                    </div>
                                )}
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    )
}
