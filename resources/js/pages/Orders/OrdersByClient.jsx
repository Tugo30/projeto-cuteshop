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
    if (!date) return "—";
    return new Date(date).toLocaleDateString("pt-BR");
}

export default function OrdersByClient() {
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [expanded, setExpanded] = useState({});
    const [updatingId, setUpdatingId] = useState(null);
    const [search, setSearch] = useState("");

    useEffect(() => {
        fetchData();
    }, []);

    async function fetchData() {
        try {
            const res = await axios.get("/orders/by-client/data");
            setClients(res.data);
            // Expande todos por padrão
            const exp = {};
            res.data.forEach((c) => (exp[c.id] = true));
            setExpanded(exp);
        } catch {
            setError("Erro ao carregar dados.");
        } finally {
            setLoading(false);
        }
    }

    function toggleExpand(id) {
        setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
    }

    async function handleStatus(orderId, clientId, status) {
        if (updatingId) return;
        setUpdatingId(orderId);
        try {
            const res = await axios.patch(
                `/orders/${orderId}/status`,
                { status },
                {
                    headers: { "X-CSRF-TOKEN": csrf() },
                },
            );
            setClients((prev) =>
                prev.map((c) => {
                    if (c.id !== clientId) return c;
                    return {
                        ...c,
                        orders: c.orders.map((o) =>
                            o.id === orderId
                                ? { ...o, status: res.data.status }
                                : o,
                        ),
                    };
                }),
            );
        } catch {
            alert("Erro ao atualizar status.");
        } finally {
            setUpdatingId(null);
        }
    }

    async function handleDelete(orderId, clientId) {
        if (!confirm("Excluir este pedido?")) return;
        try {
            await axios.delete(`/orders/${orderId}`, {
                headers: { "X-CSRF-TOKEN": csrf() },
            });
            setClients((prev) =>
                prev
                    .map((c) => {
                        if (c.id !== clientId) return c;
                        return {
                            ...c,
                            orders: c.orders.filter((o) => o.id !== orderId),
                        };
                    })
                    .filter((c) => c.orders.length > 0),
            );
        } catch {
            alert("Erro ao excluir.");
        }
    }

    const filtered = clients.filter(
        (c) =>
            c.nome.toLowerCase().includes(search.toLowerCase()) ||
            c.email?.toLowerCase().includes(search.toLowerCase()),
    );

    const totalPedidos = clients.reduce((acc, c) => acc + c.orders.length, 0);

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
                        Pedidos por Cliente
                    </h1>
                    <p
                        style={{
                            color: "#888",
                            fontSize: "13px",
                            margin: "4px 0 0",
                        }}
                    >
                        {clients.length} cliente(s) · {totalPedidos} pedido(s)
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

            {/* Busca */}
            <div style={{ marginBottom: "20px", position: "relative" }}>
                <i
                    className="fas fa-search"
                    style={{
                        position: "absolute",
                        left: "14px",
                        top: "50%",
                        transform: "translateY(-50%)",
                        color: "#aaa",
                        fontSize: "14px",
                    }}
                />
                <input
                    placeholder="Buscar cliente..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    style={{
                        width: "100%",
                        padding: "10px 14px 10px 38px",
                        borderRadius: "8px",
                        border: "1px solid #e2e8f0",
                        fontSize: "14px",
                        outline: "none",
                        boxSizing: "border-box",
                        background: "#fff",
                    }}
                />
            </div>

            {loading ? (
                <div
                    style={{
                        textAlign: "center",
                        padding: "60px",
                        color: "#888",
                    }}
                >
                    Carregando...
                </div>
            ) : error ? (
                <div style={{ color: "#e63946", padding: "12px" }}>{error}</div>
            ) : filtered.length === 0 ? (
                <div
                    style={{
                        textAlign: "center",
                        padding: "60px",
                        color: "#aaa",
                    }}
                >
                    <i
                        className="fas fa-users"
                        style={{
                            fontSize: "40px",
                            marginBottom: "12px",
                            display: "block",
                        }}
                    />
                    Nenhum cliente com pedidos encontrado.
                </div>
            ) : (
                <div
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "16px",
                    }}
                >
                    {filtered.map((client) => {
                        const isOpen = expanded[client.id] ?? true;
                        const totalCliente = client.orders.reduce(
                            (acc, o) => acc + parseFloat(o.total ?? 0),
                            0,
                        );

                        return (
                            <div
                                key={client.id}
                                style={{
                                    border: "1px solid #e2e8f0",
                                    borderRadius: "14px",
                                    overflow: "hidden",
                                    background: "#fff",
                                    boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
                                }}
                            >
                                {/* Header do cliente */}
                                <div
                                    onClick={() => toggleExpand(client.id)}
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "space-between",
                                        padding: "16px 20px",
                                        cursor: "pointer",
                                        background: isOpen ? "#fafafa" : "#fff",
                                        borderBottom: isOpen
                                            ? "1px solid #e2e8f0"
                                            : "none",
                                        gap: "12px",
                                        flexWrap: "wrap",
                                    }}
                                >
                                    <div
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "12px",
                                        }}
                                    >
                                        <div
                                            style={{
                                                width: "40px",
                                                height: "40px",
                                                borderRadius: "10px",
                                                background: "#fff1f2",
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                flexShrink: 0,
                                            }}
                                        >
                                            <i
                                                className={`fas ${client.tipo === "PF" ? "fa-user" : "fa-building"}`}
                                                style={{
                                                    color: "#e63946",
                                                    fontSize: "16px",
                                                }}
                                            />
                                        </div>
                                        <div>
                                            <p
                                                style={{
                                                    margin: 0,
                                                    fontWeight: "700",
                                                    fontSize: "15px",
                                                    color: "#111",
                                                }}
                                            >
                                                {client.nome}
                                            </p>
                                            <p
                                                style={{
                                                    margin: 0,
                                                    fontSize: "12px",
                                                    color: "#888",
                                                }}
                                            >
                                                {client.email}
                                            </p>
                                        </div>
                                    </div>

                                    <div
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "16px",
                                        }}
                                    >
                                        <div style={{ textAlign: "right" }}>
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
                                                    margin: 0,
                                                    fontSize: "15px",
                                                    fontWeight: "700",
                                                    color: "#e63946",
                                                }}
                                            >
                                                {formatPreco(totalCliente)}
                                            </p>
                                        </div>
                                        <div
                                            style={{
                                                display: "flex",
                                                alignItems: "center",
                                                gap: "6px",
                                            }}
                                        >
                                            <span
                                                style={{
                                                    padding: "3px 10px",
                                                    borderRadius: "999px",
                                                    background: "#f1f5f9",
                                                    color: "#475569",
                                                    fontSize: "12px",
                                                    fontWeight: "600",
                                                }}
                                            >
                                                {client.orders.length} pedido(s)
                                            </span>
                                            <i
                                                className={`fas fa-chevron-${isOpen ? "up" : "down"}`}
                                                style={{
                                                    color: "#aaa",
                                                    fontSize: "13px",
                                                }}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Pedidos do cliente */}
                                {isOpen && (
                                    <div
                                        style={{
                                            padding: "16px 20px",
                                            display: "flex",
                                            flexDirection: "column",
                                            gap: "12px",
                                        }}
                                    >
                                        {client.orders.map((order) => {
                                            const st =
                                                statusStyle[order.status] ??
                                                statusStyle.pendente;
                                            return (
                                                <div
                                                    key={order.id}
                                                    style={{
                                                        border: "1px solid #f1f5f9",
                                                        borderRadius: "10px",
                                                        padding: "14px 16px",
                                                        background: "#fafafa",
                                                    }}
                                                >
                                                    {/* Cabeçalho pedido */}
                                                    <div
                                                        style={{
                                                            display: "flex",
                                                            justifyContent:
                                                                "space-between",
                                                            alignItems:
                                                                "center",
                                                            flexWrap: "wrap",
                                                            gap: "8px",
                                                        }}
                                                    >
                                                        <div>
                                                            <span
                                                                style={{
                                                                    fontWeight:
                                                                        "700",
                                                                    fontSize:
                                                                        "14px",
                                                                    color: "#111",
                                                                }}
                                                            >
                                                                Pedido #
                                                                {order.id}
                                                            </span>
                                                            <span
                                                                style={{
                                                                    marginLeft:
                                                                        "8px",
                                                                    fontSize:
                                                                        "12px",
                                                                    color: "#888",
                                                                }}
                                                            >
                                                                {formatDate(
                                                                    order.created_at,
                                                                )}
                                                            </span>
                                                        </div>
                                                        <span
                                                            style={{
                                                                padding:
                                                                    "3px 10px",
                                                                borderRadius:
                                                                    "999px",
                                                                fontSize:
                                                                    "11px",
                                                                fontWeight:
                                                                    "600",
                                                                background:
                                                                    st.bg,
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
                                                                "repeat(auto-fill, minmax(150px, 1fr))",
                                                            gap: "10px",
                                                            marginTop: "10px",
                                                        }}
                                                    >
                                                        <div>
                                                            <p
                                                                style={{
                                                                    margin: 0,
                                                                    fontSize:
                                                                        "10px",
                                                                    color: "#aaa",
                                                                    fontWeight:
                                                                        "600",
                                                                    textTransform:
                                                                        "uppercase",
                                                                }}
                                                            >
                                                                Pagamento
                                                            </p>
                                                            <p
                                                                style={{
                                                                    margin: "2px 0 0",
                                                                    fontSize:
                                                                        "13px",
                                                                    color: "#333",
                                                                }}
                                                            >
                                                                {order
                                                                    .payment_method
                                                                    ?.nome ??
                                                                    "—"}
                                                            </p>
                                                        </div>
                                                        <div>
                                                            <p
                                                                style={{
                                                                    margin: 0,
                                                                    fontSize:
                                                                        "10px",
                                                                    color: "#aaa",
                                                                    fontWeight:
                                                                        "600",
                                                                    textTransform:
                                                                        "uppercase",
                                                                }}
                                                            >
                                                                Cupom
                                                            </p>
                                                            <p
                                                                style={{
                                                                    margin: "2px 0 0",
                                                                    fontSize:
                                                                        "13px",
                                                                    color: "#333",
                                                                }}
                                                            >
                                                                {order.coupon
                                                                    ?.codigo ??
                                                                    "Nenhum"}
                                                            </p>
                                                        </div>
                                                        <div>
                                                            <p
                                                                style={{
                                                                    margin: 0,
                                                                    fontSize:
                                                                        "10px",
                                                                    color: "#aaa",
                                                                    fontWeight:
                                                                        "600",
                                                                    textTransform:
                                                                        "uppercase",
                                                                }}
                                                            >
                                                                Total
                                                            </p>
                                                            <p
                                                                style={{
                                                                    margin: "2px 0 0",
                                                                    fontSize:
                                                                        "14px",
                                                                    fontWeight:
                                                                        "700",
                                                                    color: "#e63946",
                                                                }}
                                                            >
                                                                {formatPreco(
                                                                    order.total,
                                                                )}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    {/* Itens */}
                                                    {order.items?.length >
                                                        0 && (
                                                        <div
                                                            style={{
                                                                marginTop:
                                                                    "10px",
                                                                display: "flex",
                                                                flexWrap:
                                                                    "wrap",
                                                                gap: "6px",
                                                            }}
                                                        >
                                                            {order.items.map(
                                                                (item, i) => (
                                                                    <span
                                                                        key={i}
                                                                        style={{
                                                                            padding:
                                                                                "3px 8px",
                                                                            borderRadius:
                                                                                "6px",
                                                                            background:
                                                                                "#e2e8f0",
                                                                            fontSize:
                                                                                "12px",
                                                                            color: "#475569",
                                                                        }}
                                                                    >
                                                                        {item
                                                                            .service
                                                                            ?.nome ??
                                                                            "—"}
                                                                        {item.dominio &&
                                                                            ` · ${item.dominio}`}
                                                                        {` · ${item.ciclo}`}
                                                                        {` · ${formatPreco(item.subtotal)}`}
                                                                    </span>
                                                                ),
                                                            )}
                                                        </div>
                                                    )}

                                                    {/* Ações */}
                                                    <div
                                                        style={{
                                                            display: "flex",
                                                            gap: "8px",
                                                            marginTop: "12px",
                                                            flexWrap: "wrap",
                                                        }}
                                                    >
                                                        {order.status ===
                                                            "pendente" && (
                                                            <button
                                                                onClick={() =>
                                                                    handleStatus(
                                                                        order.id,
                                                                        client.id,
                                                                        "confirmado",
                                                                    )
                                                                }
                                                                disabled={
                                                                    updatingId ===
                                                                    order.id
                                                                }
                                                                style={{
                                                                    padding:
                                                                        "6px 12px",
                                                                    borderRadius:
                                                                        "7px",
                                                                    cursor: "pointer",
                                                                    border: "1px solid #86efac",
                                                                    background:
                                                                        "#f0fdf4",
                                                                    color: "#16a34a",
                                                                    fontSize:
                                                                        "12px",
                                                                    fontWeight:
                                                                        "500",
                                                                    opacity:
                                                                        updatingId ===
                                                                        order.id
                                                                            ? 0.6
                                                                            : 1,
                                                                }}
                                                            >
                                                                <i className="fas fa-check me-1" />{" "}
                                                                Confirmar
                                                            </button>
                                                        )}
                                                        {order.status ===
                                                            "confirmado" && (
                                                            <button
                                                                onClick={() =>
                                                                    handleStatus(
                                                                        order.id,
                                                                        client.id,
                                                                        "pendente",
                                                                    )
                                                                }
                                                                disabled={
                                                                    updatingId ===
                                                                    order.id
                                                                }
                                                                style={{
                                                                    padding:
                                                                        "6px 12px",
                                                                    borderRadius:
                                                                        "7px",
                                                                    cursor: "pointer",
                                                                    border: "1px solid #fde68a",
                                                                    background:
                                                                        "#fef9c3",
                                                                    color: "#854d0e",
                                                                    fontSize:
                                                                        "12px",
                                                                    fontWeight:
                                                                        "500",
                                                                    opacity:
                                                                        updatingId ===
                                                                        order.id
                                                                            ? 0.6
                                                                            : 1,
                                                                }}
                                                            >
                                                                <i className="fas fa-clock me-1" />{" "}
                                                                Pendente
                                                            </button>
                                                        )}
                                                        {order.status !==
                                                            "cancelado" && (
                                                            <button
                                                                onClick={() =>
                                                                    handleStatus(
                                                                        order.id,
                                                                        client.id,
                                                                        "cancelado",
                                                                    )
                                                                }
                                                                disabled={
                                                                    updatingId ===
                                                                    order.id
                                                                }
                                                                style={{
                                                                    padding:
                                                                        "6px 12px",
                                                                    borderRadius:
                                                                        "7px",
                                                                    cursor: "pointer",
                                                                    border: "1px solid #fca5a5",
                                                                    background:
                                                                        "#fff1f2",
                                                                    color: "#dc2626",
                                                                    fontSize:
                                                                        "12px",
                                                                    fontWeight:
                                                                        "500",
                                                                    opacity:
                                                                        updatingId ===
                                                                        order.id
                                                                            ? 0.6
                                                                            : 1,
                                                                }}
                                                            >
                                                                <i className="fas fa-ban me-1" />{" "}
                                                                Cancelar
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() =>
                                                                handleDelete(
                                                                    order.id,
                                                                    client.id,
                                                                )
                                                            }
                                                            style={{
                                                                padding:
                                                                    "6px 12px",
                                                                borderRadius:
                                                                    "7px",
                                                                cursor: "pointer",
                                                                border: "1px solid #fca5a5",
                                                                background:
                                                                    "#fff1f2",
                                                                color: "#dc2626",
                                                                fontSize:
                                                                    "12px",
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
                    })}
                </div>
            )}
        </div>
    );
}
