import { useState, useEffect } from "react"
import axios from "axios"

const csrf = () => document.querySelector('meta[name="csrf-token"]')?.content
const brl = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

const statusStyle = {
    pending: { bg: "#fffbeb", color: "#b45309", label: "Aguardando pagamento" },
    paid: { bg: "#f0fdf4", color: "#166534", label: "Pago" },
    shipped: { bg: "#eff6ff", color: "#1d4ed8", label: "Enviado" },
    delivered: { bg: "#f0fdf4", color: "#166534", label: "Entregue" },
    canceled: { bg: "#fef2f2", color: "#991b1b", label: "Cancelado" },
    expired: { bg: "#fef2f2", color: "#991b1b", label: "Expirado" },
    refunded: { bg: "#f4f4f0", color: "#555", label: "Reembolsado" },
}

export default function AdminOrdersList() {
    const [orders, setOrders] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")
    const [trackingDrafts, setTrackingDrafts] = useState({})
    const [savingCode, setSavingCode] = useState(null)

    useEffect(() => { fetchOrders() }, [])

    async function fetchOrders() {
        setLoading(true)
        try {
            const res = await axios.get("/api/admin/pedidos")
            setOrders(res.data.data ?? res.data) // suporta paginação do Laravel
        } catch {
            setError("Erro ao carregar pedidos.")
        } finally {
            setLoading(false)
        }
    }

    async function handleShip(code) {
        const tracking = trackingDrafts[code]
        if (!tracking?.trim()) return

        setSavingCode(code)
        try {
            const res = await axios.put(`/api/admin/pedidos/${code}/rastreio`,
                { tracking_code: tracking },
                { headers: { "X-CSRF-TOKEN": csrf() } }
            )
            setOrders(prev => prev.map(o => o.code === code ? { ...o, ...res.data } : o))
        } catch (err) {
            alert(err.response?.data?.message ?? "Erro ao salvar rastreio.")
        } finally {
            setSavingCode(null)
        }
    }

    if (loading) return <p style={{ padding: 40, color: "#888" }}>Carregando pedidos...</p>
    if (error) return <p style={{ padding: 40, color: "#b91c1c" }}>{error}</p>

    return (
        <div style={{ fontFamily: "'DM Sans', sans-serif", maxWidth: "1000px" }}>
            <h1 style={{ fontSize: "22px", fontWeight: 700, color: "#111", marginBottom: "20px" }}>
                Pedidos
            </h1>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {orders.map(order => {
                    const st = statusStyle[order.status] ?? { bg: "#f4f4f0", color: "#555", label: order.status }
                    return (
                        <div key={order.code} style={{
                            background: "#fff", border: "1px solid #eee", borderRadius: "12px",
                            padding: "20px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                        }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <div>
                                    <span style={{ fontWeight: 700, fontSize: "15px" }}>Pedido {order.code}</span>
                                    <span style={{ marginLeft: 10, fontSize: 12, color: "#888" }}>
                                        {order.customer_name}
                                    </span>
                                </div>
                                <span style={{
                                    padding: "4px 12px", borderRadius: "999px", fontSize: "12px",
                                    fontWeight: 600, background: st.bg, color: st.color,
                                }}>
                                    {st.label}
                                </span>
                            </div>

                            <p style={{ margin: "10px 0 0", fontSize: "14px", fontWeight: 600 }}>
                                {brl(order.total_cents / 100)}
                            </p>

                            {order.tracking_code ? (
                                <p style={{ marginTop: 12, fontSize: 13, color: "#166534" }}>
                                    Rastreio: <strong>{order.tracking_code}</strong>
                                </p>
                            ) : order.status === 'paid' ? (
                                <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                                    <input
                                        placeholder="Código de rastreio"
                                        value={trackingDrafts[order.code] ?? ''}
                                        onChange={e => setTrackingDrafts(prev => ({ ...prev, [order.code]: e.target.value }))}
                                        style={{ flex: 1, padding: "8px 10px", border: "1px solid #ddd", borderRadius: 6, fontSize: 13 }}
                                    />
                                    <button
                                        onClick={() => handleShip(order.code)}
                                        disabled={savingCode === order.code}
                                        style={{
                                            padding: "8px 16px", borderRadius: 6, border: "none",
                                            background: "#111", color: "#fff", fontSize: 12, cursor: "pointer",
                                            opacity: savingCode === order.code ? 0.6 : 1,
                                        }}
                                    >
                                        {savingCode === order.code ? "Salvando..." : "Marcar enviado"}
                                    </button>
                                </div>
                            ) : null}
                        </div>
                    )
                })}
            </div>
        </div>
    )
}