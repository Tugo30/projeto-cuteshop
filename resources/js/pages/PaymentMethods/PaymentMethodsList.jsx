import { useState, useEffect } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const csrf = () => document.querySelector('meta[name="csrf-token"]').content;

export default function PaymentMethodsList() {
    const [methods, setMethods] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [formError, setFormError] = useState("");
    const [nome, setNome] = useState("");

    const isAdmin = window.authUser?.role === "Admin";

    useEffect(() => {
        fetchMethods();
    }, []);

    async function fetchMethods() {
        try {
            const res = await axios.get("/payment-methods/data");
            setMethods(res.data);
        } catch {
            setError("Erro ao carregar formas de pagamento.");
        } finally {
            setLoading(false);
        }
    }

    async function handleSubmit(e) {
        e.preventDefault();
        if (!nome.trim()) {
            setFormError("O nome é obrigatório.");
            return;
        }

        setSaving(true);
        setFormError("");
        setSuccess("");

        try {
            const res = await axios.post(
                "/payment-methods",
                { nome },
                {
                    headers: { "X-CSRF-TOKEN": csrf() },
                },
            );
            setMethods([...methods, res.data]);
            setNome("");
            setSuccess("Forma de pagamento cadastrada com sucesso!");
            setTimeout(() => setSuccess(""), 4000);
        } catch (err) {
            if (err.response?.status === 422) {
                setFormError(
                    err.response.data.errors?.nome?.[0] ?? "Erro de validação.",
                );
            } else {
                setFormError("Erro ao salvar.");
            }
        } finally {
            setSaving(false);
        }
    }

    async function handleDelete(id) {
        if (!confirm("Tem certeza que deseja excluir esta forma de pagamento?"))
            return;
        try {
            await axios.delete(`/payment-methods/${id}`, {
                headers: { "X-CSRF-TOKEN": csrf() },
            });
            setMethods(methods.filter((m) => m.id !== id));
        } catch {
            alert("Erro ao excluir.");
        }
    }

    return (
        <div
            style={{
                fontFamily: "'DM Sans', sans-serif",
                padding: "8px",
                maxWidth: "800px",
            }}
        >
            {/* Header */}
            <div style={{ marginBottom: "24px" }}>
                <h1
                    style={{
                        fontSize: "22px",
                        fontWeight: "700",
                        color: "#111",
                        margin: 0,
                    }}
                >
                    Formas de Pagamento
                </h1>
                <p
                    style={{
                        color: "#888",
                        fontSize: "13px",
                        margin: "4px 0 0",
                    }}
                >
                    Cadastre as formas de pagamento disponíveis
                </p>
            </div>

            {/* Formulário — só admin vê */}
            {isAdmin && (
                <Card className="mb-6">
                    <CardHeader>
                        <CardTitle className="text-base">
                            Nova Forma de Pagamento
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {success && (
                            <div className="bg-green-100 text-green-800 border border-green-300 rounded px-4 py-2 text-sm mb-4">
                                {success}
                            </div>
                        )}

                        <div
                            style={{
                                display: "flex",
                                gap: "12px",
                                alignItems: "flex-end",
                            }}
                        >
                            <div style={{ flex: 1 }}>
                                <Label>Nome</Label>
                                <Input
                                    placeholder="Ex: Cartão de Crédito, PIX, Boleto..."
                                    value={nome}
                                    onChange={(e) => setNome(e.target.value)}
                                    onKeyDown={(e) =>
                                        e.key === "Enter" && handleSubmit(e)
                                    }
                                />
                                {formError && (
                                    <p className="text-red-500 text-sm mt-1">
                                        {formError}
                                    </p>
                                )}
                            </div>
                            <Button
                                onClick={handleSubmit}
                                disabled={saving}
                                className="text-white"
                            >
                                {saving ? "Salvando..." : "Cadastrar"}
                            </Button>
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
            ) : methods.length === 0 ? (
                <div
                    style={{
                        textAlign: "center",
                        padding: "60px",
                        color: "#aaa",
                    }}
                >
                    <i
                        className="fas fa-credit-card"
                        style={{
                            fontSize: "40px",
                            marginBottom: "12px",
                            display: "block",
                        }}
                    />
                    Nenhuma forma de pagamento cadastrada ainda.
                </div>
            ) : (
                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns:
                            "repeat(auto-fill, minmax(220px, 1fr))",
                        gap: "12px",
                    }}
                >
                    {methods.map((method) => (
                        <div
                            key={method.id}
                            style={{
                                background: "#fff",
                                border: "1px solid #eee",
                                borderRadius: "12px",
                                padding: "16px 20px",
                                boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                                display: "flex",
                                alignItems: "center",
                                gap: "14px",
                            }}
                        >
                            {/* Ícone */}
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
                                    className="fas fa-credit-card"
                                    style={{
                                        color: "#e63946",
                                        fontSize: "16px",
                                    }}
                                />
                            </div>

                            {/* Nome */}
                            <div style={{ flex: 1 }}>
                                <p
                                    style={{
                                        margin: 0,
                                        fontWeight: "600",
                                        fontSize: "14px",
                                        color: "#111",
                                    }}
                                >
                                    {method.nome}
                                </p>
                                <p
                                    style={{
                                        margin: "2px 0 0",
                                        fontSize: "11px",
                                        color: "#bbb",
                                    }}
                                >
                                    ID #{method.id}
                                </p>
                            </div>

                            {/* Botão excluir — só admin vê */}
                            {isAdmin && (
                                <button
                                    onClick={() => handleDelete(method.id)}
                                    style={{
                                        padding: "6px 10px",
                                        borderRadius: "8px",
                                        cursor: "pointer",
                                        border: "1px solid #fca5a5",
                                        background: "#fff1f2",
                                        color: "#dc2626",
                                        fontSize: "13px",
                                        transition: "all 0.15s",
                                        flexShrink: 0,
                                    }}
                                    title="Excluir"
                                >
                                    <i className="fas fa-trash" />
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
