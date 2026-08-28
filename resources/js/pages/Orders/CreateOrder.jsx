import { useState } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const csrf = () => document.querySelector('meta[name="csrf-token"]').content;

const emptyItem = {
    service_id: "",
    dominio: "",
    ciclo: "mensal",
    quantidade: 1,
    preco_substituido: "",
};

const cicloOptions = [
    { value: "gratuito", label: "Gratuito" },
    { value: "uma_vez", label: "Uma Vez (Anual)" },
    { value: "mensal", label: "Mensal" },
    { value: "trimestral", label: "Trimestral" },
    { value: "semestral", label: "Semestral" },
    { value: "anual", label: "Anual" },
];

const statusOptions = [
    { value: "pendente", label: "Pendente" },
    { value: "confirmado", label: "Confirmado" },
    { value: "cancelado", label: "Cancelado" },
];

function formatPreco(value) {
    if (!value && value !== 0) return "R$ 0,00";
    return `R$ ${parseFloat(value).toFixed(2).replace(".", ",")}`;
}

export default function CreateOrder() {
    const clients = window.orderClients ?? [];
    const paymentMethods = window.orderPaymentMethods ?? [];
    const services = window.orderServices ?? [];

    const [form, setForm] = useState({
        client_id: "",
        payment_method_id: "",
        coupon_code: "",
        status: "pendente",
    });
    const [items, setItems] = useState([{ ...emptyItem }]);
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState("");
    const [couponMsg, setCouponMsg] = useState("");

    // Busca preço do serviço pelo ciclo
    function getServicePreco(serviceId, ciclo) {
        const s = services.find((s) => s.id == serviceId);
        if (!s) return 0;
        if (s.tipo_cobranca === "gratuito") return 0;
        if (s.tipo_cobranca === "uma_vez") return parseFloat(s.preco ?? 0) || 0;
        // recorrente — busca pelo ciclo selecionado
        const map = {
            mensal: s.preco_mensal,
            trimestral: s.preco_trimestral,
            semestral: s.preco_semestral,
            anual: s.preco_anual,
            uma_vez: s.preco,
            gratuito: 0,
        };
        return parseFloat(map[ciclo] ?? 0) || 0;
    }

    function getServiceNome(serviceId) {
        return services.find((s) => s.id == serviceId)?.nome ?? "";
    }

    // Calcula ciclos disponíveis para um serviço
    function getCiclosDisponiveis(serviceId) {
        return cicloOptions;
    }

    function handleFormChange(e) {
        setForm({ ...form, [e.target.name]: e.target.value });
    }

    function handleItemChange(index, field, value) {
        const updated = [...items];
        updated[index] = { ...updated[index], [field]: value };

        // Se mudou o serviço, pré-seleciona o ciclo baseado no tipo_cobranca
        if (field === "service_id") {
            const s = services.find((sv) => sv.id == value);
            if (s?.tipo_cobranca === "gratuito") {
                updated[index].ciclo = "gratuito";
            } else if (s?.tipo_cobranca === "uma_vez") {
                updated[index].ciclo = "uma_vez";
            } else {
                // recorrente — pré-seleciona o primeiro ciclo que tiver preço
                if (s?.preco_mensal) updated[index].ciclo = "mensal";
                else if (s?.preco_trimestral)
                    updated[index].ciclo = "trimestral";
                else if (s?.preco_semestral) updated[index].ciclo = "semestral";
                else if (s?.preco_anual) updated[index].ciclo = "anual";
                else updated[index].ciclo = "mensal";
            }
        }

        setItems(updated);
    }

    function addItem() {
        setItems([...items, { ...emptyItem }]);
    }

    function removeItem(index) {
        if (items.length === 1) return;
        setItems(items.filter((_, i) => i !== index));
    }

    // Calcula subtotal de um item
    function itemSubtotal(item) {
        const preco = item.preco_substituido
            ? parseFloat(item.preco_substituido)
            : getServicePreco(item.service_id, item.ciclo);
        return preco * (parseInt(item.quantidade) || 1);
    }

    // Calcula total geral
    const subtotalGeral = items.reduce(
        (acc, item) => acc + itemSubtotal(item),
        0,
    );

    async function handleCouponBlur() {
        if (!form.coupon_code) {
            setCouponMsg("");
            return;
        }
        try {
            const res = await axios.get(
                `/orders/coupon-check?code=${form.coupon_code}`,
            );
            setCouponMsg(
                `✓ Cupom válido — ${res.data.tipo === "percentual" ? res.data.valor + "% de desconto" : formatPreco(res.data.valor) + " de desconto"}`,
            );
        } catch {
            setCouponMsg("✗ Cupom inválido ou expirado");
        }
    }

    // Calcula desconto
    function calcDesconto() {
        if (!couponMsg.startsWith("✓")) return 0;
        // Busca valor do cupom já validado
        return 0; // será calculado no backend
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setLoading(true);
        setErrors({});
        setSuccess("");

        try {
            await axios.post(
                "/orders",
                { ...form, items },
                {
                    headers: { "X-CSRF-TOKEN": csrf() },
                },
            );
            setSuccess("Pedido criado com sucesso!");
            setTimeout(() => (window.location.href = "/orders"), 1500);
        } catch (err) {
            if (err.response?.status === 422) {
                setErrors(err.response.data.errors ?? {});
            } else {
                setErrors({ geral: ["Erro ao salvar pedido."] });
            }
        } finally {
            setLoading(false);
        }
    }

    return (
        <div
            style={{
                fontFamily: "'DM Sans', sans-serif",
                maxWidth: "860px",
                margin: "0 auto",
                padding: "24px 8px",
            }}
        >
            {/* Header */}
            <div style={{ marginBottom: "24px" }}>
                <a
                    href="/orders"
                    style={{
                        color: "#888",
                        fontSize: "13px",
                        textDecoration: "none",
                    }}
                >
                    <i className="fas fa-arrow-left me-1" /> Voltar para pedidos
                </a>
                <h1
                    style={{
                        fontSize: "22px",
                        fontWeight: "700",
                        color: "#111",
                        margin: "8px 0 0",
                    }}
                >
                    Novo Pedido
                </h1>
            </div>

            {success && (
                <div className="bg-green-100 text-green-800 border border-green-300 rounded px-4 py-2 text-sm mb-4">
                    {success}
                </div>
            )}
            {errors.geral && (
                <div className="bg-red-100 text-red-800 border border-red-300 rounded px-4 py-2 text-sm mb-4">
                    {errors.geral[0]}
                </div>
            )}

            {/* Detalhes do Pedido */}
            <Card className="mb-4">
                <CardHeader>
                    <CardTitle className="text-base">
                        Detalhes do Pedido
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div
                        style={{
                            display: "grid",
                            gridTemplateColumns: "1fr 1fr",
                            gap: "16px",
                        }}
                    >
                        {/* Cliente */}
                        <div style={{ gridColumn: "1 / -1" }}>
                            <Label>Cliente *</Label>
                            <select
                                name="client_id"
                                value={form.client_id}
                                onChange={handleFormChange}
                                className="w-full border rounded px-3 py-2"
                            >
                                <option value="">Selecione um cliente</option>
                                {clients.map((c) => (
                                    <option key={c.id} value={c.id}>
                                        {c.nome} — {c.email}
                                    </option>
                                ))}
                            </select>
                            {errors.client_id && (
                                <p className="text-red-500 text-sm mt-1">
                                    {errors.client_id[0]}
                                </p>
                            )}
                        </div>

                        {/* Forma de Pagamento */}
                        <div>
                            <Label>Forma de Pagamento</Label>
                            <select
                                name="payment_method_id"
                                value={form.payment_method_id}
                                onChange={handleFormChange}
                                className="w-full border rounded px-3 py-2"
                            >
                                <option value="">Nenhuma</option>
                                {paymentMethods.map((p) => (
                                    <option key={p.id} value={p.id}>
                                        {p.nome}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Status */}
                        <div>
                            <Label>Status do Pedido</Label>
                            <select
                                name="status"
                                value={form.status}
                                onChange={handleFormChange}
                                className="w-full border rounded px-3 py-2"
                            >
                                {statusOptions.map((s) => (
                                    <option key={s.value} value={s.value}>
                                        {s.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Cupom */}
                        <div style={{ gridColumn: "1 / -1" }}>
                            <Label>Código Promocional</Label>
                            <Input
                                name="coupon_code"
                                placeholder="Digite o código do cupom"
                                value={form.coupon_code}
                                onChange={handleFormChange}
                                onBlur={handleCouponBlur}
                            />
                            {couponMsg && (
                                <p
                                    className={`text-sm mt-1 ${couponMsg.startsWith("✓") ? "text-green-600" : "text-red-500"}`}
                                >
                                    {couponMsg}
                                </p>
                            )}
                            {errors.coupon_code && (
                                <p className="text-red-500 text-sm mt-1">
                                    {errors.coupon_code[0]}
                                </p>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Itens do Pedido */}
            <Card className="mb-4">
                <CardHeader>
                    <CardTitle className="text-base">
                        Produtos / Serviços
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div
                        style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: "16px",
                        }}
                    >
                        {items.map((item, index) => {
                            const ciclosDisponiveis = getCiclosDisponiveis(
                                item.service_id,
                            );
                            const precoUnitario = item.preco_substituido
                                ? parseFloat(item.preco_substituido)
                                : getServicePreco(item.service_id, item.ciclo);
                            const subtotal = itemSubtotal(item);

                            return (
                                <div
                                    key={index}
                                    style={{
                                        padding: "16px",
                                        borderRadius: "10px",
                                        border: "1px solid #e2e8f0",
                                        background: "#fafafa",
                                        position: "relative",
                                    }}
                                >
                                    {/* Cabeçalho do item */}
                                    <div
                                        style={{
                                            display: "flex",
                                            justifyContent: "space-between",
                                            alignItems: "center",
                                            marginBottom: "12px",
                                        }}
                                    >
                                        <span
                                            style={{
                                                fontWeight: "600",
                                                fontSize: "13px",
                                                color: "#555",
                                            }}
                                        >
                                            Item #{index + 1}{" "}
                                            {item.service_id
                                                ? `— ${getServiceNome(item.service_id)}`
                                                : ""}
                                        </span>
                                        {items.length > 1 && (
                                            <button
                                                onClick={() =>
                                                    removeItem(index)
                                                }
                                                style={{
                                                    background: "#fee2e2",
                                                    border: "none",
                                                    borderRadius: "6px",
                                                    color: "#dc2626",
                                                    padding: "4px 8px",
                                                    cursor: "pointer",
                                                    fontSize: "12px",
                                                }}
                                            >
                                                <i className="fas fa-trash me-1" />{" "}
                                                Remover
                                            </button>
                                        )}
                                    </div>

                                    <div
                                        style={{
                                            display: "grid",
                                            gridTemplateColumns: "1fr 1fr",
                                            gap: "12px",
                                        }}
                                    >
                                        {/* Serviço */}
                                        <div style={{ gridColumn: "1 / -1" }}>
                                            <Label>Produto / Serviço *</Label>
                                            <select
                                                value={item.service_id}
                                                onChange={(e) =>
                                                    handleItemChange(
                                                        index,
                                                        "service_id",
                                                        e.target.value,
                                                    )
                                                }
                                                className="w-full border rounded px-3 py-2"
                                            >
                                                <option value="">
                                                    Selecione
                                                </option>
                                                {services.map((s) => (
                                                    <option
                                                        key={s.id}
                                                        value={s.id}
                                                    >
                                                        {s.nome}
                                                    </option>
                                                ))}
                                            </select>
                                            {errors[
                                                `items.${index}.service_id`
                                            ] && (
                                                <p className="text-red-500 text-sm mt-1">
                                                    {
                                                        errors[
                                                            `items.${index}.service_id`
                                                        ][0]
                                                    }
                                                </p>
                                            )}
                                        </div>

                                        {/* Domínio */}
                                        <div>
                                            <Label>Domínio</Label>
                                            <Input
                                                placeholder="ex: meusite.com.br"
                                                value={item.dominio}
                                                onChange={(e) =>
                                                    handleItemChange(
                                                        index,
                                                        "dominio",
                                                        e.target.value,
                                                    )
                                                }
                                            />
                                        </div>

                                        {/* Ciclo */}
                                        <div>
                                            <Label>Ciclo de Pagamento</Label>
                                            <select
                                                value={item.ciclo}
                                                onChange={(e) =>
                                                    handleItemChange(
                                                        index,
                                                        "ciclo",
                                                        e.target.value,
                                                    )
                                                }
                                                className="w-full border rounded px-3 py-2"
                                            >
                                                {ciclosDisponiveis.map((c) => (
                                                    <option
                                                        key={c.value}
                                                        value={c.value}
                                                    >
                                                        {c.label}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        {/* Quantidade */}
                                        {/* <div>
                                            <Label>Quantidade</Label>
                                            <Input
                                                type="number"
                                                min="1"
                                                value={item.quantidade}
                                                onChange={(e) =>
                                                    handleItemChange(
                                                        index,
                                                        "quantidade",
                                                        e.target.value,
                                                    )
                                                }
                                            />
                                        </div> */}

                                        {/* Substituir Preço */}
                                        <div>
                                            <Label>
                                                Substituir Preço{" "}
                                                <span
                                                    style={{
                                                        color: "#aaa",
                                                        fontSize: "11px",
                                                    }}
                                                >
                                                    (opcional)
                                                </span>
                                            </Label>
                                            <Input
                                                type="number"
                                                step="0.01"
                                                placeholder="Deixe em branco para usar o padrão"
                                                value={item.preco_substituido}
                                                onChange={(e) =>
                                                    handleItemChange(
                                                        index,
                                                        "preco_substituido",
                                                        e.target.value,
                                                    )
                                                }
                                            />
                                        </div>

                                        {/* Preço calculado */}
                                        <div
                                            style={{
                                                gridColumn: "1 / -1",
                                                display: "flex",
                                                justifyContent: "space-between",
                                                padding: "10px 12px",
                                                borderRadius: "8px",
                                                background: "#fff",
                                                border: "1px solid #e2e8f0",
                                                fontSize: "13px",
                                            }}
                                        >
                                            <span style={{ color: "#888" }}>
                                                Preço unitário:{" "}
                                                <strong
                                                    style={{ color: "#111" }}
                                                >
                                                    {formatPreco(precoUnitario)}
                                                </strong>
                                                {item.preco_substituido && (
                                                    <span
                                                        style={{
                                                            color: "#e63946",
                                                            marginLeft: "6px",
                                                        }}
                                                    >
                                                        (substituído)
                                                    </span>
                                                )}
                                            </span>
                                            <span
                                                style={{
                                                    fontWeight: "700",
                                                    color: "#111",
                                                }}
                                            >
                                                Subtotal:{" "}
                                                {formatPreco(subtotal)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}

                        {/* Adicionar item */}
                        <button
                            onClick={addItem}
                            style={{
                                padding: "10px",
                                borderRadius: "8px",
                                cursor: "pointer",
                                border: "2px dashed #e2e8f0",
                                background: "transparent",
                                color: "#888",
                                fontSize: "13px",
                                fontWeight: "500",
                                transition: "all 0.15s",
                            }}
                        >
                            <i className="fas fa-plus me-2" />
                            Adicionar Outro Produto / Serviço
                        </button>
                    </div>
                </CardContent>
            </Card>

            {/* Resumo do Pedido */}
            <Card className="mb-6">
                <CardHeader>
                    <CardTitle className="text-base">
                        Resumo do Pedido
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div
                        style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: "8px",
                        }}
                    >
                        {items.map(
                            (item, index) =>
                                item.service_id && (
                                    <div
                                        key={index}
                                        style={{
                                            display: "flex",
                                            justifyContent: "space-between",
                                            fontSize: "13px",
                                            color: "#555",
                                        }}
                                    >
                                        <span>
                                            {getServiceNome(item.service_id)} ×{" "}
                                            {item.quantidade}
                                        </span>
                                        <span>
                                            {formatPreco(itemSubtotal(item))}
                                        </span>
                                    </div>
                                ),
                        )}

                        <div
                            style={{
                                height: "1px",
                                background: "#eee",
                                margin: "8px 0",
                            }}
                        />

                        {couponMsg.startsWith("✓") && (
                            <div
                                style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    fontSize: "13px",
                                    color: "#16a34a",
                                }}
                            >
                                <span>
                                    <i className="fas fa-tag me-1" /> Desconto
                                    (cupom)
                                </span>
                                <span>— calculado no servidor</span>
                            </div>
                        )}

                        <div
                            style={{
                                display: "flex",
                                justifyContent: "space-between",
                                fontWeight: "700",
                                fontSize: "16px",
                            }}
                        >
                            <span>Total estimado</span>
                            <span style={{ color: "#e63946" }}>
                                {formatPreco(subtotalGeral)}
                            </span>
                        </div>

                        <p
                            style={{
                                fontSize: "11px",
                                color: "#aaa",
                                margin: "4px 0 0",
                            }}
                        >
                            * O total final pode variar com o desconto do cupom
                            aplicado no servidor.
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Botão */}
            <Button
                onClick={handleSubmit}
                disabled={loading}
                className="w-full text-white"
                style={{ height: "46px", fontSize: "15px" }}
            >
                {loading ? "Salvando..." : "Confirmar Pedido"}
            </Button>
        </div>
    );
}
