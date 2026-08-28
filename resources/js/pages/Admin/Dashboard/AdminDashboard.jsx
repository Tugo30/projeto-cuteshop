import { useState, useEffect } from "react"
import axios from "axios"

const brl = (cents) => (Number(cents || 0) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export default function AdminDashboard() {
    const [data, setData] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")

    useEffect(() => {
        axios.get("/api/admin/metricas")
            .then(res => setData(res.data))
            .catch(() => setError("Erro ao carregar métricas."))
            .finally(() => setLoading(false))
    }, [])

    if (loading) return <p style={{ padding: 40, color: "#888" }}>Carregando métricas...</p>
    if (error) return <p style={{ padding: 40, color: "#b91c1c" }}>{error}</p>

    return (
        <div style={{ fontFamily: "'DM Sans', sans-serif", maxWidth: "1000px" }}>
            <h1 style={{ fontSize: "22px", fontWeight: 700, color: "#111", marginBottom: "24px" }}>
                Dashboard
            </h1>

            <div style={{
                display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: "16px", marginBottom: "32px",
            }}>
                <Card label="Vendas no mês" value={brl(data.vendas_mes_cents)} />
                <Card label="Pedidos pagos no mês" value={data.qtd_pedidos_mes} />
                <Card label="Ticket médio" value={brl(data.ticket_medio_cents)} />
                <Card label="Pedidos aguardando pagamento" value={data.pedidos_pendentes} />
            </div>

            <h2 style={{ fontSize: "16px", fontWeight: 700, color: "#111", marginBottom: "12px" }}>
                Mais vendidos no mês
            </h2>

            {data.mais_vendidos.length === 0 ? (
                <p style={{ color: "#888", fontSize: 13 }}>Nenhuma venda registrada este mês ainda.</p>
            ) : (
                <div style={{ background: "#fff", border: "1px solid #eee", borderRadius: "12px", overflow: "hidden" }}>
                    {data.mais_vendidos.map((item, i) => (
                        <div key={i} style={{
                            display: "flex", justifyContent: "space-between", padding: "12px 20px",
                            borderTop: i > 0 ? "1px solid #f1f5f9" : "none", fontSize: "14px",
                        }}>
                            <span>{item.product_name}</span>
                            <strong>{item.total_vendido} un.</strong>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

function Card({ label, value }) {
    return (
        <div style={{
            background: "#fff", border: "1px solid #eee", borderRadius: "12px",
            padding: "20px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
        }}>
            <p style={{ margin: 0, fontSize: "11px", color: "#aaa", fontWeight: 600, textTransform: "uppercase" }}>
                {label}
            </p>
            <p style={{ margin: "6px 0 0", fontSize: "22px", fontWeight: 700, color: "#111" }}>
                {value}
            </p>
        </div>
    )
}