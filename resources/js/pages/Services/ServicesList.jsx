import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const csrf = () => document.querySelector('meta[name="csrf-token"]').content;

const emptyForm = {
    category_id: "",
    nome: "",
    descricao: "",
    tipo_cobranca: "gratuito",
    periodicidade: "",
    preco: "",
    preco_mensal: "",
    preco_trimestral: "",
    preco_semestral: "",
    preco_anual: "",
};

const tipoCobrancaLabel = {
    gratuito: { label: "Gratuito", color: "#16a34a", bg: "#dcfce7" },
    uma_vez: { label: "Uma Vez", color: "#0891b2", bg: "#ecfeff" },
    recorrente: { label: "Recorrente", color: "#7c3aed", bg: "#f5f3ff" },
};

const periodicidadeLabel = {
    mensal: "Mensal",
    trimestral: "Trimestral",
    semestral: "Semestral",
    anual: "Anual",
};

function formatPreco(value) {
    if (!value && value !== 0) return "—";
    return `R$ ${parseFloat(value).toFixed(2).replace(".", ",")}`;
}

export default function ServicesList() {
    const [services, setServices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [errors, setErrors] = useState({});
    const [form, setForm] = useState(emptyForm);
    const [editingId, setEditingId] = useState(null);
    const [activeTab, setActiveTab] = useState("geral");

    // Ref para sempre ter o form atualizado no submit
    const formRef = useRef(form);
    useEffect(() => {
        formRef.current = form;
    }, [form]);

    const isAdmin = window.authUser?.role === "Admin";
    const categories = window.categories ?? [];

    useEffect(() => {
        fetchServices();
    }, []);

    async function fetchServices() {
        try {
            const res = await axios.get("/services/data");
            setServices(res.data);
        } catch {
            setError("Erro ao carregar serviços.");
        } finally {
            setLoading(false);
        }
    }

    function handleChange(e) {
        const { name, value } = e.target;
        setForm((prev) => {
            if (name === "tipo_cobranca") {
                return { ...prev, tipo_cobranca: value, periodicidade: "" };
            }
            return { ...prev, [name]: value };
        });
    }

    function handleEdit(service) {
        setEditingId(service.id);
        setForm({
            category_id: service.category_id ?? "",
            nome: service.nome ?? "",
            descricao: service.descricao ?? "",
            tipo_cobranca: service.tipo_cobranca ?? "gratuito",
            periodicidade: service.periodicidade ?? "",
            preco: service.preco ?? "",
            preco_mensal: service.preco_mensal ?? "",
            preco_trimestral: service.preco_trimestral ?? "",
            preco_semestral: service.preco_semestral ?? "",
            preco_anual: service.preco_anual ?? "",
        });
        setActiveTab("geral");
        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    function handleCancel() {
        setEditingId(null);
        setForm(emptyForm);
        setErrors({});
        setActiveTab("geral");
    }

    async function handleSubmit(e) {
        e.preventDefault();
        console.log("FORM DATA:", formRef.current)
        setSaving(true);
        setErrors({});
        setSuccess("");

        // Usa formRef.current para garantir dados mais recentes
        const data = formRef.current;

        try {
            if (editingId) {
                const res = await axios.put(`/services/${editingId}`, data, {
                    headers: { "X-CSRF-TOKEN": csrf() },
                });
                setServices((prev) =>
                    prev.map((s) =>
                        s.id === editingId
                            ? {
                                  ...res.data,
                                  category: categories.find(
                                      (c) => c.id == res.data.category_id,
                                  ),
                              }
                            : s,
                    ),
                );
                setSuccess("Serviço atualizado com sucesso!");
                setEditingId(null);
            } else {
                const res = await axios.post("/services", data, {
                    headers: { "X-CSRF-TOKEN": csrf() },
                });
                setServices((prev) => [
                    ...prev,
                    {
                        ...res.data,
                        category: categories.find(
                            (c) => c.id == res.data.category_id,
                        ),
                    },
                ]);
                setSuccess("Serviço cadastrado com sucesso!");
            }
            setForm(emptyForm);
            setActiveTab("geral");
            setTimeout(() => setSuccess(""), 4000);
        } catch (err) {
            if (err.response?.status === 422) {
                setErrors(err.response.data.errors ?? {});
            } else {
                setErrors({ nome: ["Erro ao salvar."] });
            }
        } finally {
            setSaving(false);
        }
    }

    async function handleToggle(id) {
        try {
            const res = await axios.patch(
                `/services/${id}/toggle`,
                {},
                {
                    headers: { "X-CSRF-TOKEN": csrf() },
                },
            );
            setServices((prev) =>
                prev.map((s) =>
                    s.id === id ? { ...s, active: res.data.active } : s,
                ),
            );
        } catch {
            alert("Erro ao atualizar status.");
        }
    }

    async function handleDelete(id) {
        if (!confirm("Tem certeza que deseja excluir este serviço?")) return;
        try {
            await axios.delete(`/services/${id}`, {
                headers: { "X-CSRF-TOKEN": csrf() },
            });
            setServices((prev) => prev.filter((s) => s.id !== id));
        } catch {
            alert("Erro ao excluir.");
        }
    }

    const tabStyle = (tab) => ({
        padding: "8px 20px",
        borderRadius: "8px 8px 0 0",
        cursor: "pointer",
        border: "none",
        fontSize: "14px",
        fontWeight: activeTab === tab ? "600" : "400",
        background: activeTab === tab ? "#fff" : "transparent",
        color: activeTab === tab ? "#e63946" : "#888",
        borderBottom:
            activeTab === tab ? "2px solid #e63946" : "2px solid transparent",
        transition: "all 0.15s",
    });

    function precoResumo(service) {
        if (service.tipo_cobranca === "gratuito") return "Gratuito";
        if (service.tipo_cobranca === "uma_vez")
            return formatPreco(service.preco) + " / ano";
        if (service.tipo_cobranca === "recorrente") {
            const map = {
                mensal: service.preco_mensal,
                trimestral: service.preco_trimestral,
                semestral: service.preco_semestral,
                anual: service.preco_anual,
            };
            return (
                Object.entries(map)
                    .filter(([, v]) => v)
                    .map(
                        ([k, v]) =>
                            `${formatPreco(v)}/${periodicidadeLabel[k].toLowerCase()}`,
                    )
                    .join(" · ") || "—"
            );
        }
        return "—";
    }

    return (
        <div
            style={{
                fontFamily: "'DM Sans', sans-serif",
                padding: "8px",
                maxWidth: "1000px",
            }}
        >
            <div style={{ marginBottom: "24px" }}>
                <h1
                    style={{
                        fontSize: "22px",
                        fontWeight: "700",
                        color: "#111",
                        margin: 0,
                    }}
                >
                    Serviços / Produtos
                </h1>
                <p
                    style={{
                        color: "#888",
                        fontSize: "13px",
                        margin: "4px 0 0",
                    }}
                >
                    {services.length} item(s) cadastrado(s)
                </p>
            </div>

            {isAdmin && (
                <Card className="mb-6">
                    <CardHeader>
                        <CardTitle className="text-base">
                            {editingId
                                ? "Editar Serviço"
                                : "Novo Serviço / Produto"}
                        </CardTitle>
                        <div
                            style={{
                                display: "flex",
                                borderBottom: "1px solid #eee",
                                marginTop: "12px",
                                gap: "4px",
                            }}
                        >
                            <button
                                style={tabStyle("geral")}
                                onClick={() => setActiveTab("geral")}
                            >
                                <i className="fas fa-box me-2" />
                                Geral
                            </button>
                            <button
                                style={tabStyle("cobranca")}
                                onClick={() => setActiveTab("cobranca")}
                            >
                                <i className="fas fa-credit-card me-2" />
                                Cobrança
                                {form.tipo_cobranca &&
                                    form.tipo_cobranca !== "gratuito" && (
                                        <span
                                            style={{
                                                marginLeft: "6px",
                                                padding: "1px 6px",
                                                borderRadius: "999px",
                                                fontSize: "10px",
                                                background: "#fff1f2",
                                                color: "#e63946",
                                                fontWeight: "600",
                                            }}
                                        >
                                            {
                                                tipoCobrancaLabel[
                                                    form.tipo_cobranca
                                                ]?.label
                                            }
                                        </span>
                                    )}
                            </button>
                        </div>
                    </CardHeader>

                    <CardContent>
                        {success && (
                            <div className="bg-green-100 text-green-800 border border-green-300 rounded px-4 py-2 text-sm mb-4">
                                {success}
                            </div>
                        )}

                        {/* Aba Geral */}
                        {activeTab === "geral" && (
                            <div
                                style={{
                                    display: "grid",
                                    gridTemplateColumns: "1fr 1fr",
                                    gap: "16px",
                                }}
                            >
                                <div>
                                    <Label>Categoria</Label>
                                    <select
                                        name="category_id"
                                        value={form.category_id}
                                        onChange={handleChange}
                                        className="w-full border rounded px-3 py-2"
                                    >
                                        <option value="">Selecione</option>
                                        {categories.map((cat) => (
                                            <option key={cat.id} value={cat.id}>
                                                {cat.nome}
                                            </option>
                                        ))}
                                    </select>
                                    {errors.category_id && (
                                        <p className="text-red-500 text-sm mt-1">
                                            {errors.category_id[0]}
                                        </p>
                                    )}
                                </div>
                                <div>
                                    <Label>Nome</Label>
                                    <Input
                                        name="nome"
                                        placeholder="Nome do serviço"
                                        value={form.nome}
                                        onChange={handleChange}
                                    />
                                    {errors.nome && (
                                        <p className="text-red-500 text-sm mt-1">
                                            {errors.nome[0]}
                                        </p>
                                    )}
                                </div>
                                <div style={{ gridColumn: "1 / -1" }}>
                                    <Label>Descrição</Label>
                                    <Input
                                        name="descricao"
                                        placeholder="Descrição opcional"
                                        value={form.descricao}
                                        onChange={handleChange}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Aba Cobrança */}
                        {activeTab === "cobranca" && (
                            <div
                                style={{
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: "20px",
                                }}
                            >
                                <div>
                                    <Label>Tipo de Cobrança</Label>
                                    <div
                                        style={{
                                            display: "grid",
                                            gridTemplateColumns: "1fr 1fr 1fr",
                                            gap: "12px",
                                            marginTop: "8px",
                                        }}
                                    >
                                        {[
                                            {
                                                value: "gratuito",
                                                label: "Gratuito",
                                                icon: "fa-gift",
                                                desc: "Sem cobrança",
                                            },
                                            {
                                                value: "uma_vez",
                                                label: "Uma Vez",
                                                icon: "fa-circle-check",
                                                desc: "Cobrança anual única",
                                            },
                                            {
                                                value: "recorrente",
                                                label: "Recorrente",
                                                icon: "fa-rotate",
                                                desc: "Cobrança periódica",
                                            },
                                        ].map((tipo) => (
                                            <button
                                                key={tipo.value}
                                                type="button"
                                                onClick={() =>
                                                    setForm((prev) => ({
                                                        ...prev,
                                                        tipo_cobranca:
                                                            tipo.value,
                                                        periodicidade: "",
                                                    }))
                                                }
                                                style={{
                                                    padding: "16px 12px",
                                                    borderRadius: "10px",
                                                    cursor: "pointer",
                                                    border: `2px solid ${form.tipo_cobranca === tipo.value ? "#e63946" : "#e2e8f0"}`,
                                                    background:
                                                        form.tipo_cobranca ===
                                                        tipo.value
                                                            ? "#fff1f2"
                                                            : "#fff",
                                                    color:
                                                        form.tipo_cobranca ===
                                                        tipo.value
                                                            ? "#e63946"
                                                            : "#888",
                                                    textAlign: "center",
                                                    transition: "all 0.15s",
                                                }}
                                            >
                                                <i
                                                    className={`fas ${tipo.icon}`}
                                                    style={{
                                                        fontSize: "20px",
                                                        display: "block",
                                                        marginBottom: "6px",
                                                    }}
                                                />
                                                <span
                                                    style={{
                                                        fontWeight: "600",
                                                        fontSize: "13px",
                                                        display: "block",
                                                    }}
                                                >
                                                    {tipo.label}
                                                </span>
                                                <span
                                                    style={{
                                                        fontSize: "11px",
                                                        color: "#aaa",
                                                    }}
                                                >
                                                    {tipo.desc}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Preço único — Uma Vez */}
                                {form.tipo_cobranca === "uma_vez" && (
                                    <div>
                                        <Label>Preço Anual (R$)</Label>
                                        <Input
                                            name="preco"
                                            type="number"
                                            step="0.01"
                                            placeholder="0,00"
                                            value={form.preco}
                                            onChange={handleChange}
                                        />
                                        {errors.preco && (
                                            <p className="text-red-500 text-sm mt-1">
                                                {errors.preco[0]}
                                            </p>
                                        )}
                                    </div>
                                )}

                                {/* Preços recorrentes */}
                                {form.tipo_cobranca === "recorrente" && (
                                    <div>
                                        <Label>Preços por Periodicidade</Label>
                                        <p
                                            style={{
                                                fontSize: "12px",
                                                color: "#aaa",
                                                margin: "2px 0 12px",
                                            }}
                                        >
                                            Preencha apenas as periodicidades
                                            que deseja oferecer
                                        </p>
                                        <div
                                            style={{
                                                display: "grid",
                                                gridTemplateColumns: "1fr 1fr",
                                                gap: "12px",
                                            }}
                                        >
                                            {[
                                                {
                                                    name: "preco_mensal",
                                                    label: "Mensal",
                                                    icon: "fa-calendar-day",
                                                },
                                                {
                                                    name: "preco_trimestral",
                                                    label: "Trimestral",
                                                    icon: "fa-calendar-week",
                                                },
                                                {
                                                    name: "preco_semestral",
                                                    label: "Semestral",
                                                    icon: "fa-calendar-alt",
                                                },
                                                {
                                                    name: "preco_anual",
                                                    label: "Anual",
                                                    icon: "fa-calendar",
                                                },
                                            ].map((p) => (
                                                <div
                                                    key={p.name}
                                                    style={{
                                                        padding: "14px",
                                                        borderRadius: "10px",
                                                        border: `1px solid ${form[p.name] ? "#e63946" : "#e2e8f0"}`,
                                                        background: form[p.name]
                                                            ? "#fff1f2"
                                                            : "#fafafa",
                                                        transition: "all 0.15s",
                                                    }}
                                                >
                                                    <label
                                                        style={{
                                                            fontSize: "12px",
                                                            fontWeight: "600",
                                                            color: form[p.name]
                                                                ? "#e63946"
                                                                : "#888",
                                                            display: "flex",
                                                            alignItems:
                                                                "center",
                                                            gap: "6px",
                                                            marginBottom: "8px",
                                                        }}
                                                    >
                                                        <i
                                                            className={`fas ${p.icon}`}
                                                        />
                                                        {p.label}
                                                    </label>
                                                    <div
                                                        style={{
                                                            display: "flex",
                                                            alignItems:
                                                                "center",
                                                            gap: "6px",
                                                        }}
                                                    >
                                                        <span
                                                            style={{
                                                                color: "#888",
                                                                fontSize:
                                                                    "13px",
                                                            }}
                                                        >
                                                            R$
                                                        </span>
                                                        <Input
                                                            name={p.name}
                                                            type="number"
                                                            step="0.01"
                                                            placeholder="0,00"
                                                            value={form[p.name]}
                                                            onChange={
                                                                handleChange
                                                            }
                                                            style={{
                                                                border: "none",
                                                                background:
                                                                    "transparent",
                                                                padding: "0",
                                                                height: "auto",
                                                            }}
                                                        />
                                                    </div>
                                                    {errors[p.name] && (
                                                        <p className="text-red-500 text-sm mt-1">
                                                            {errors[p.name][0]}
                                                        </p>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Resumo */}
                                <div
                                    style={{
                                        padding: "14px 16px",
                                        borderRadius: "10px",
                                        background: "#f8fafc",
                                        border: "1px solid #e2e8f0",
                                        fontSize: "13px",
                                        color: "#555",
                                    }}
                                >
                                    <strong>Resumo: </strong>
                                    {form.tipo_cobranca === "gratuito" &&
                                        "Este serviço é gratuito, sem nenhuma cobrança."}
                                    {form.tipo_cobranca === "uma_vez" &&
                                        `Cobrança única anual de ${form.preco ? formatPreco(form.preco) : "R$ —"}.`}
                                    {form.tipo_cobranca === "recorrente" &&
                                        (() => {
                                            const ativos = [
                                                form.preco_mensal &&
                                                    `${formatPreco(form.preco_mensal)}/mês`,
                                                form.preco_trimestral &&
                                                    `${formatPreco(form.preco_trimestral)}/trimestre`,
                                                form.preco_semestral &&
                                                    `${formatPreco(form.preco_semestral)}/semestre`,
                                                form.preco_anual &&
                                                    `${formatPreco(form.preco_anual)}/ano`,
                                            ].filter(Boolean);
                                            return ativos.length
                                                ? `Cobrança recorrente: ${ativos.join(", ")}.`
                                                : "Preencha ao menos um preço de periodicidade.";
                                        })()}
                                </div>
                            </div>
                        )}

                        <div
                            style={{
                                display: "flex",
                                gap: "8px",
                                marginTop: "20px",
                            }}
                        >
                            <Button
                                onClick={handleSubmit}
                                disabled={saving}
                                className="text-white"
                            >
                                {saving
                                    ? "Salvando..."
                                    : editingId
                                      ? "Salvar Alterações"
                                      : "Cadastrar"}
                            </Button>
                            {editingId && (
                                <Button
                                    variant="outline"
                                    onClick={handleCancel}
                                >
                                    Cancelar
                                </Button>
                            )}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Lista */}
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
            ) : services.length === 0 ? (
                <div
                    style={{
                        textAlign: "center",
                        padding: "60px",
                        color: "#aaa",
                    }}
                >
                    <i
                        className="fas fa-box-open"
                        style={{
                            fontSize: "40px",
                            marginBottom: "12px",
                            display: "block",
                        }}
                    />
                    Nenhum serviço cadastrado ainda.
                </div>
            ) : (
                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns:
                            "repeat(auto-fill, minmax(280px, 1fr))",
                        gap: "16px",
                    }}
                >
                    {services.map((service) => {
                        const cobranca =
                            tipoCobrancaLabel[service.tipo_cobranca] ??
                            tipoCobrancaLabel.gratuito;
                        return (
                            <div
                                key={service.id}
                                style={{
                                    background: "#fff",
                                    border: "1px solid #eee",
                                    borderRadius: "12px",
                                    padding: "20px",
                                    boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: "12px",
                                    opacity: service.active ? 1 : 0.6,
                                }}
                            >
                                <div
                                    style={{
                                        display: "flex",
                                        alignItems: "flex-start",
                                        gap: "12px",
                                    }}
                                >
                                    <div
                                        style={{
                                            width: "44px",
                                            height: "44px",
                                            borderRadius: "10px",
                                            background: service.active
                                                ? "#fff1f2"
                                                : "#f1f5f9",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            flexShrink: 0,
                                        }}
                                    >
                                        <i
                                            className="fas fa-box"
                                            style={{
                                                color: service.active
                                                    ? "#e63946"
                                                    : "#94a3b8",
                                                fontSize: "16px",
                                            }}
                                        />
                                    </div>
                                    <div
                                        style={{ flex: 1, overflow: "hidden" }}
                                    >
                                        <p
                                            style={{
                                                margin: 0,
                                                fontWeight: "600",
                                                fontSize: "15px",
                                                color: "#111",
                                                whiteSpace: "nowrap",
                                                overflow: "hidden",
                                                textOverflow: "ellipsis",
                                            }}
                                        >
                                            {service.nome}
                                        </p>
                                        <p
                                            style={{
                                                margin: "2px 0 0",
                                                fontSize: "12px",
                                                color: "#888",
                                            }}
                                        >
                                            {service.category?.nome ??
                                                "Sem categoria"}
                                        </p>
                                    </div>
                                </div>

                                {service.descricao && (
                                    <p
                                        style={{
                                            margin: 0,
                                            fontSize: "13px",
                                            color: "#666",
                                            lineHeight: "1.4",
                                        }}
                                    >
                                        {service.descricao}
                                    </p>
                                )}

                                <div
                                    style={{
                                        fontSize: "13px",
                                        color: "#444",
                                        fontWeight: "500",
                                    }}
                                >
                                    {precoResumo(service)}
                                </div>

                                <div
                                    style={{
                                        display: "flex",
                                        gap: "4px",
                                        flexWrap: "wrap",
                                    }}
                                >
                                    <span
                                        style={{
                                            padding: "3px 8px",
                                            borderRadius: "999px",
                                            fontSize: "11px",
                                            fontWeight: "600",
                                            background: cobranca.bg,
                                            color: cobranca.color,
                                        }}
                                    >
                                        {cobranca.label}
                                        {service.periodicidade &&
                                            ` · ${periodicidadeLabel[service.periodicidade]}`}
                                    </span>
                                    <span
                                        style={{
                                            padding: "3px 8px",
                                            borderRadius: "999px",
                                            fontSize: "11px",
                                            fontWeight: "600",
                                            background: service.active
                                                ? "#dcfce7"
                                                : "#fee2e2",
                                            color: service.active
                                                ? "#16a34a"
                                                : "#dc2626",
                                        }}
                                    >
                                        {service.active ? "Ativo" : "Inativo"}
                                    </span>
                                </div>

                                {isAdmin && (
                                    <div
                                        style={{ display: "flex", gap: "8px" }}
                                    >
                                        <button
                                            onClick={() => handleEdit(service)}
                                            style={{
                                                flex: 1,
                                                padding: "8px",
                                                borderRadius: "8px",
                                                cursor: "pointer",
                                                border: "1px solid #e2e8f0",
                                                background: "#f8fafc",
                                                color: "#475569",
                                                fontSize: "13px",
                                                fontWeight: "500",
                                            }}
                                        >
                                            <i className="fas fa-pen me-1" />{" "}
                                            Editar
                                        </button>
                                        <button
                                            onClick={() =>
                                                handleToggle(service.id)
                                            }
                                            style={{
                                                flex: 1,
                                                padding: "8px",
                                                borderRadius: "8px",
                                                cursor: "pointer",
                                                border: `1px solid ${service.active ? "#fca5a5" : "#86efac"}`,
                                                background: service.active
                                                    ? "#fff1f2"
                                                    : "#f0fdf4",
                                                color: service.active
                                                    ? "#dc2626"
                                                    : "#16a34a",
                                                fontSize: "13px",
                                                fontWeight: "500",
                                            }}
                                        >
                                            <i
                                                className={`fas ${service.active ? "fa-ban" : "fa-check"} me-1`}
                                            />
                                            {service.active
                                                ? "Inativar"
                                                : "Ativar"}
                                        </button>
                                        <button
                                            onClick={() =>
                                                handleDelete(service.id)
                                            }
                                            style={{
                                                padding: "8px 12px",
                                                borderRadius: "8px",
                                                cursor: "pointer",
                                                border: "1px solid #fca5a5",
                                                background: "#fff1f2",
                                                color: "#dc2626",
                                                fontSize: "13px",
                                            }}
                                        >
                                            <i className="fas fa-trash" />
                                        </button>
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
