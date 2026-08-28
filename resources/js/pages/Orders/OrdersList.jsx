import { useState, useEffect } from "react";
import axios from "axios";

const csrf = () => document.querySelector('meta[name="csrf-token"]').content;

const statusStyle = {
    pendente: { bg: "#fef9c3", color: "#854d0e", label: "Pendente" },
    confirmado: { bg: "#dcfce7", color: "#166534", label: "Confirmado" },
    cancelado: { bg: "#fee2e2", color: "#991b1b", label: "Cancelado" },
};

function formatPreco(value) {
    if (!value && value !== 0) return "R$ 0,00";
    return `R$ ${parseFloat(value).toFixed(2).replace(".", ",")}`;
}

function formatDate(date) {
    return new Date(date).toLocaleDateString("pt-BR");
}

export default function OrdersList() {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [updatingId, setUpdatingId] = useState(null);

    useEffect(() => {
        fetchOrders();
    }, []);

    async function fetchOrders() {
        try {
            const res = await axios.get("/orders/data");
            setOrders(res.data);
        } catch {
            setError("Erro ao carregar pedidos.");
        } finally {
            setLoading(false);
        }
    }

    async function handleDelete(id) {
        if (!confirm("Tem certeza que deseja excluir este pedido?")) return;
        try {
            await axios.delete(`/orders/${id}`, {
                headers: { "X-CSRF-TOKEN": csrf() },
            });
            setOrders((prev) => prev.filter((o) => o.id !== id));
        } catch {
            alert("Erro ao excluir.");
        }
    }

    async function handleStatus(id, status) {
        if (updatingId) return;
        setUpdatingId(id);
        try {
            const res = await axios.patch(
                `/orders/${id}/status`,
                { status },
                {
                    headers: { "X-CSRF-TOKEN": csrf() },
                },
            );
            setOrders((prev) =>
                prev.map((o) =>
                    o.id === id ? { ...o, status: res.data.status } : o,
                ),
            );
        } catch {
            alert("Erro ao atualizar status.");
        } finally {
            setUpdatingId(null);
        }
    }

    return (
        <div
            style={{
                fontFamily: "'DM Sans', sans-serif",
                padding: "16px",
                maxWidth: "1100px",
            }}
        >
            {/* Header */}
            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "24px",
                    flexWrap: "wrap",
                    gap: "12px",
                }}
            >
                <div>
                    <h1
                        style={{
                            fontSize: "22px",
                            fontWeight: "700",
                            color: "#111",
                            margin: 0,
                        }}
                    >
                        Pedidos
                    </h1>
                    <p
                        style={{
                            color: "#888",
                            fontSize: "13px",
                            margin: "4px 0 0",
                        }}
                    >
                        {orders.length} pedido(s) encontrado(s)
                    </p>
                </div>
                <a
                    href="/orders/create"
                    style={{
                        padding: "10px 20px",
                        borderRadius: "8px",
                        background: "#e63946",
                        color: "#fff",
                        textDecoration: "none",
                        fontSize: "13px",
                        fontWeight: "600",
                        whiteSpace: "nowrap",
                    }}
                >
                    <i className="fas fa-plus me-2" />
                    Novo Pedido
                </a>
            </div>

            {loading ? (
                <div
                    style={{
                        textAlign: "center",
                        padding: "40px",
                        color: "#888",
                    }}
                >
                    Carregando...
                </div>
            ) : error ? (
                <div style={{ color: "#e63946", padding: "12px" }}>{error}</div>
            ) : orders.length === 0 ? (
                <div
                    style={{
                        textAlign: "center",
                        padding: "60px",
                        color: "#aaa",
                    }}
                >
                    <i
                        className="fas fa-file-invoice"
                        style={{
                            fontSize: "40px",
                            marginBottom: "12px",
                            display: "block",
                        }}
                    />
                    Nenhum pedido cadastrado ainda.
                </div>
            ) : (
                <div
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "12px",
                    }}
                >
                    {orders.map((order) => {
                        const st =
                            statusStyle[order.status] ?? statusStyle.pendente;
                        return (
                            <div
                                key={order.id}
                                style={{
                                    background: "#fff",
                                    border: "1px solid #eee",
                                    borderRadius: "12px",
                                    padding: "20px",
                                    boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                                }}
                            >
                                {/* Cabeçalho */}
                                <div
                                    style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "flex-start",
                                        flexWrap: "wrap",
                                        gap: "8px",
                                    }}
                                >
                                    <div>
                                        <span
                                            style={{
                                                fontWeight: "700",
                                                fontSize: "15px",
                                                color: "#111",
                                            }}
                                        >
                                            Pedido #{order.id}
                                        </span>
                                        <span
                                            style={{
                                                marginLeft: "10px",
                                                fontSize: "12px",
                                                color: "#888",
                                            }}
                                        >
                                            {formatDate(order.created_at)}
                                        </span>
                                    </div>
                                    <span
                                        style={{
                                            padding: "4px 12px",
                                            borderRadius: "999px",
                                            fontSize: "12px",
                                            fontWeight: "600",
                                            background: st.bg,
                                            color: st.color,
                                        }}
                                    >
                                        {st.label}
                                    </span>
                                </div>

                                {/* Info */}
                                <div
                                    style={{
                                        display: "grid",
                                        gridTemplateColumns:
                                            "repeat(auto-fill, minmax(180px, 1fr))",
                                        gap: "12px",
                                        marginTop: "14px",
                                    }}
                                >
                                    <div>
                                        <p
                                            style={{
                                                margin: 0,
                                                fontSize: "11px",
                                                color: "#aaa",
                                                fontWeight: "600",
                                                textTransform: "uppercase",
                                            }}
                                        >
                                            Cliente
                                        </p>
                                        <p
                                            style={{
                                                margin: "2px 0 0",
                                                fontSize: "13px",
                                                color: "#333",
                                                fontWeight: "600",
                                            }}
                                        >
                                            {order.client?.nome ?? "—"}
                                        </p>
                                        <p
                                            style={{
                                                margin: 0,
                                                fontSize: "12px",
                                                color: "#888",
                                            }}
                                        >
                                            {order.client?.email ?? ""}
                                        </p>
                                    </div>
                                    <div>
                                        <p
                                            style={{
                                                margin: 0,
                                                fontSize: "11px",
                                                color: "#aaa",
                                                fontWeight: "600",
                                                textTransform: "uppercase",
                                            }}
                                        >
                                            Forma de Pagamento
                                        </p>
                                        <p
                                            style={{
                                                margin: "2px 0 0",
                                                fontSize: "13px",
                                                color: "#333",
                                            }}
                                        >
                                            {order.payment_method?.nome ?? "—"}
                                        </p>
                                    </div>
                                    <div>
                                        <p
                                            style={{
                                                margin: 0,
                                                fontSize: "11px",
                                                color: "#aaa",
                                                fontWeight: "600",
                                                textTransform: "uppercase",
                                            }}
                                        >
                                            Cupom
                                        </p>
                                        <p
                                            style={{
                                                margin: "2px 0 0",
                                                fontSize: "13px",
                                                color: "#333",
                                            }}
                                        >
                                            {order.coupon?.codigo ?? "Nenhum"}
                                        </p>
                                    </div>
                                    <div>
                                        <p
                                            style={{
                                                margin: 0,
                                                fontSize: "11px",
                                                color: "#aaa",
                                                fontWeight: "600",
                                                textTransform: "uppercase",
                                            }}
                                        >
                                            Total
                                        </p>
                                        <p
                                            style={{
                                                margin: "2px 0 0",
                                                fontSize: "15px",
                                                fontWeight: "700",
                                                color: "#e63946",
                                            }}
                                        >
                                            {formatPreco(order.total)}
                                        </p>
                                    </div>
                                </div>

                                {/* Itens */}
                                {order.items?.length > 0 && (
                                    <div
                                        style={{
                                            marginTop: "14px",
                                            borderTop: "1px solid #f1f5f9",
                                            paddingTop: "12px",
                                        }}
                                    >
                                        <p
                                            style={{
                                                margin: "0 0 8px",
                                                fontSize: "11px",
                                                color: "#aaa",
                                                fontWeight: "600",
                                                textTransform: "uppercase",
                                            }}
                                        >
                                            Itens
                                        </p>
                                        <div
                                            style={{
                                                display: "flex",
                                                flexWrap: "wrap",
                                                gap: "6px",
                                            }}
                                        >
                                            {order.items.map((item, i) => (
                                                <span
                                                    key={i}
                                                    style={{
                                                        padding: "4px 10px",
                                                        borderRadius: "6px",
                                                        background: "#f1f5f9",
                                                        fontSize: "12px",
                                                        color: "#475569",
                                                    }}
                                                >
                                                    {item.service?.nome ?? "—"}
                                                    {item.dominio &&
                                                        ` · ${item.dominio}`}
                                                    {` · ${item.ciclo}`}
                                                    {` · ${formatPreco(item.subtotal)}`}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Ações */}
                                <div
                                    style={{
                                        display: "flex",
                                        gap: "8px",
                                        marginTop: "14px",
                                        flexWrap: "wrap",
                                    }}
                                >
                                    {order.status === "pendente" && (
                                        <button
                                            onClick={() =>
                                                handleStatus(
                                                    order.id,
                                                    "confirmado",
                                                )
                                            }
                                            disabled={updatingId === order.id}
                                            style={{
                                                padding: "7px 14px",
                                                borderRadius: "7px",
                                                cursor: "pointer",
                                                border: "1px solid #86efac",
                                                background: "#f0fdf4",
                                                color: "#16a34a",
                                                fontSize: "12px",
                                                fontWeight: "500",
                                                opacity:
                                                    updatingId === order.id
                                                        ? 0.6
                                                        : 1,
                                            }}
                                        >
                                            <i className="fas fa-check me-1" />{" "}
                                            Confirmar
                                        </button>
                                    )}
                                    {order.status === "confirmado" && (
                                        <button
                                            onClick={() =>
                                                handleStatus(
                                                    order.id,
                                                    "pendente",
                                                )
                                            }
                                            disabled={updatingId === order.id}
                                            style={{
                                                padding: "7px 14px",
                                                borderRadius: "7px",
                                                cursor: "pointer",
                                                border: "1px solid #fde68a",
                                                background: "#fef9c3",
                                                color: "#854d0e",
                                                fontSize: "12px",
                                                fontWeight: "500",
                                                opacity:
                                                    updatingId === order.id
                                                        ? 0.6
                                                        : 1,
                                            }}
                                        >
                                            <i className="fas fa-clock me-1" />{" "}
                                            Pendente
                                        </button>
                                    )}
                                    {order.status !== "cancelado" && (
                                        <button
                                            onClick={() =>
                                                handleStatus(
                                                    order.id,
                                                    "cancelado",
                                                )
                                            }
                                            disabled={updatingId === order.id}
                                            style={{
                                                padding: "7px 14px",
                                                borderRadius: "7px",
                                                cursor: "pointer",
                                                border: "1px solid #fca5a5",
                                                background: "#fff1f2",
                                                color: "#dc2626",
                                                fontSize: "12px",
                                                fontWeight: "500",
                                                opacity:
                                                    updatingId === order.id
                                                        ? 0.6
                                                        : 1,
                                            }}
                                        >
                                            <i className="fas fa-ban me-1" />{" "}
                                            Cancelar
                                        </button>
                                    )}
                                    <button
                                        onClick={() => handleDelete(order.id)}
                                        style={{
                                            padding: "7px 14px",
                                            borderRadius: "7px",
                                            cursor: "pointer",
                                            border: "1px solid #fca5a5",
                                            background: "#fff1f2",
                                            color: "#dc2626",
                                            fontSize: "12px",
                                        }}
                                    >
                                        <i className="fas fa-trash" />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
