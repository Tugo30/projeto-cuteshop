import { useState, useEffect } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";

const csrf = () => document.querySelector('meta[name="csrf-token"]').content;

const emptyForm = {
    tipo: "PJ",
    group_id: "",
    nome: "",
    razao_social: "",
    cnpj: "",
    cpf: "",
    telefone: "",
    email: "",
    password: "",
    password_confirmation: "",
    endereco: "",
    cidade: "",
    estado: "",
    cep: "",
};

export default function ClientForm({ clientId = null }) {
    const [form, setForm] = useState(emptyForm);
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(!!clientId);
    const [success, setSuccess] = useState("");
    const [cnpjLoading, setCnpjLoading] = useState(false);
    const [cnpjError, setCnpjError] = useState("");

    const clientGroups = window.clientGroups ?? [];
    const isEdit = !!clientId;

    useEffect(() => {
        if (!clientId) return;
        axios
            .get(`/clients/${clientId}`)
            .then((res) => {
                const c = res.data;
                setForm({
                    tipo: c.tipo ?? "PJ",
                    group_id: c.group_id ?? "",
                    nome: c.nome ?? "",
                    razao_social: c.razao_social ?? "",
                    cnpj: c.cnpj ?? "",
                    cpf: c.cpf ?? "",
                    telefone: c.telefone ?? "",
                    email: c.email ?? "",
                    password: "",
                    password_confirmation: "",
                    endereco: c.endereco ?? "",
                    cidade: c.cidade ?? "",
                    estado: c.estado ?? "",
                    cep: c.cep ?? "",
                });
            })
            .catch(() => alert("Erro ao carregar dados do cliente."))
            .finally(() => setFetching(false));
    }, [clientId]);

    function handleChange(e) {
        setForm({ ...form, [e.target.name]: e.target.value });
    }

    function formatTelefone(value) {
        return value
            .replace(/\D/g, "")
            .replace(/^(\d{2})(\d)/, "($1) $2")
            .replace(/(\d{4,5})(\d{4})$/, "$1-$2")
            .slice(0, 15);
    }

    function formatCnpj(value) {
        return value
            .replace(/\D/g, "")
            .replace(/^(\d{2})(\d)/, "$1.$2")
            .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
            .replace(/\.(\d{3})(\d)/, ".$1/$2")
            .replace(/(\d{4})(\d)/, "$1-$2")
            .slice(0, 18);
    }

    function formatCpf(value) {
        return value
            .replace(/\D/g, "")
            .replace(/(\d{3})(\d)/, "$1.$2")
            .replace(/(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
            .replace(/(\d{3})\.(\d{3})\.(\d{3})(\d)/, "$1.$2.$3-$4")
            .slice(0, 14);
    }

    function formatCep(value) {
        return value
            .replace(/\D/g, "")
            .replace(/(\d{5})(\d)/, "$1-$2")
            .slice(0, 9);
    }

    async function handleCepBlur() {
        const cep = form.cep.replace(/\D/g, "");
        if (cep.length !== 8) return;

        let data = null;

        // Tentativa 1 — ViaCEP
        try {
            const res = await axios.get(
                `https://viacep.com.br/ws/${cep}/json/`,
            );
            if (!res.data.erro) {
                data = {
                    endereco: [res.data.logradouro, res.data.bairro]
                        .filter(Boolean)
                        .join(", "),
                    cidade: res.data.localidade,
                    estado: res.data.uf,
                };
            }
        } catch {
            // Tentativa 2 — BrasilAPI
            try {
                const res = await axios.get(
                    `https://brasilapi.com.br/api/cep/v1/${cep}`,
                );
                data = {
                    endereco: [res.data.street, res.data.neighborhood]
                        .filter(Boolean)
                        .join(", "),
                    cidade: res.data.city,
                    estado: res.data.state,
                };
            } catch {
                data = null;
            }
        }

        if (data) {
            setForm((prev) => ({
                ...prev,
                endereco: data.endereco || prev.endereco,
                cidade: data.cidade || prev.cidade,
                estado: data.estado || prev.estado,
            }));
        }
    }

    async function handleCnpjBlur() {
        const cnpj = form.cnpj.replace(/\D/g, "");
        if (cnpj.length !== 14) return;

        setCnpjLoading(true);
        setCnpjError("");

        let data = null;

        try {
            const res = await axios.get(
                `https://brasilapi.com.br/api/cnpj/v1/${cnpj}`,
            );
            data = res.data;
        } catch {
            try {
                const res = await axios.get(
                    `https://www.receitaws.com.br/v1/cnpj/${cnpj}`,
                );
                if (res.data.status !== "ERROR") {
                    data = {
                        razao_social: res.data.nome,
                        ddd_telefone_1: res.data.telefone,
                        logradouro: res.data.logradouro,
                        numero: res.data.numero,
                        complemento: res.data.complemento,
                        bairro: res.data.bairro,
                        municipio: res.data.municipio,
                        uf: res.data.uf,
                        cep: res.data.cep,
                    };
                }
            } catch {
                data = null;
            }
        }

        if (!data) {
            setCnpjError("CNPJ não encontrado. Preencha manualmente.");
            setCnpjLoading(false);
            return;
        }

        const endereco = [
            data.logradouro,
            data.numero,
            data.complemento,
            data.bairro,
        ]
            .filter(Boolean)
            .join(", ");

        const telefone = (data.ddd_telefone_1 ?? "")
            .replace(/\D/g, "")
            .replace(/^(\d{2})(\d{4,5})(\d{4})$/, "($1) $2-$3");

        setForm((prev) => ({
            ...prev,
            razao_social: data.razao_social ?? prev.razao_social,
            telefone: telefone || prev.telefone,
            endereco: endereco || prev.endereco,
            cidade: data.municipio ?? prev.cidade,
            estado: data.uf ?? prev.estado,
            cep:
                (data.cep ?? "")
                    .replace(/\D/g, "")
                    .replace(/(\d{5})(\d{3})/, "$1-$2") || prev.cep,
        }));

        setCnpjLoading(false);
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setLoading(true);
        setErrors({});
        setSuccess("");

        try {
            if (isEdit) {
                await axios.put(`/clients/${clientId}`, form, {
                    headers: { "X-CSRF-TOKEN": csrf() },
                });
                setSuccess("Cliente atualizado com sucesso!");
            } else {
                await axios.post("/clients", form, {
                    headers: { "X-CSRF-TOKEN": csrf() },
                });
                setSuccess("Cliente cadastrado com sucesso!");
                setForm(emptyForm);
            }
            setTimeout(() => setSuccess(""), 4000);
        } catch (err) {
            if (err.response?.status === 422) {
                setErrors(err.response.data.errors ?? {});
            }
        } finally {
            setLoading(false);
        }
    }

    if (fetching)
        return (
            <div
                style={{ textAlign: "center", padding: "60px", color: "#888" }}
            >
                Carregando...
            </div>
        );

    return (
        <div
            className="max-w-2xl mx-auto mt-6"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
        >
            <div style={{ marginBottom: "24px" }}>
                <a
                    href="/clients"
                    style={{
                        color: "#888",
                        fontSize: "13px",
                        textDecoration: "none",
                    }}
                >
                    <i className="fas fa-arrow-left me-1" /> Voltar para
                    clientes
                </a>
                <h1
                    style={{
                        fontSize: "22px",
                        fontWeight: "700",
                        color: "#111",
                        margin: "8px 0 0",
                    }}
                >
                    {isEdit ? "Editar Cliente" : "Cadastrar Cliente"}
                </h1>
            </div>

            <Card>
                <CardContent className="pt-6 space-y-4">
                    {success && (
                        <div className="bg-green-100 text-green-800 border border-green-300 rounded px-4 py-2 text-sm">
                            {success}
                        </div>
                    )}

                    {/* Toggle PF/PJ */}
                    <div>
                        <Label>Tipo de Pessoa</Label>
                        <div
                            style={{
                                display: "flex",
                                gap: "8px",
                                marginTop: "6px",
                            }}
                        >
                            <button
                                type="button"
                                onClick={() =>
                                    setForm({
                                        ...form,
                                        tipo: "PJ",
                                        cpf: "",
                                        razao_social: "",
                                    })
                                }
                                style={{
                                    flex: 1,
                                    padding: "10px",
                                    borderRadius: "8px",
                                    cursor: "pointer",
                                    border: `2px solid ${form.tipo === "PJ" ? "#e63946" : "#e2e8f0"}`,
                                    background:
                                        form.tipo === "PJ" ? "#fff1f2" : "#fff",
                                    color:
                                        form.tipo === "PJ" ? "#e63946" : "#888",
                                    fontWeight:
                                        form.tipo === "PJ" ? "600" : "400",
                                    fontSize: "14px",
                                    transition: "all 0.15s",
                                }}
                            >
                                <i className="fas fa-building me-2" />
                                Pessoa Jurídica
                            </button>
                            <button
                                type="button"
                                onClick={() =>
                                    setForm({
                                        ...form,
                                        tipo: "PF",
                                        cnpj: "",
                                        razao_social: "",
                                    })
                                }
                                style={{
                                    flex: 1,
                                    padding: "10px",
                                    borderRadius: "8px",
                                    cursor: "pointer",
                                    border: `2px solid ${form.tipo === "PF" ? "#e63946" : "#e2e8f0"}`,
                                    background:
                                        form.tipo === "PF" ? "#fff1f2" : "#fff",
                                    color:
                                        form.tipo === "PF" ? "#e63946" : "#888",
                                    fontWeight:
                                        form.tipo === "PF" ? "600" : "400",
                                    fontSize: "14px",
                                    transition: "all 0.15s",
                                }}
                            >
                                <i className="fas fa-user me-2" />
                                Pessoa Física
                            </button>
                        </div>
                    </div>

                    {/* Grupo */}
                    <div>
                        <Label>Grupo do Cliente</Label>
                        <select
                            name="group_id"
                            value={form.group_id}
                            onChange={handleChange}
                            className="w-full border rounded px-3 py-2"
                        >
                            <option value="">Nenhum</option>
                            {clientGroups.map((g) => (
                                <option key={g.id} value={g.id}>
                                    {g.nome}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* CNPJ — só PJ */}
                    {form.tipo === "PJ" && (
                        <div>
                            <Label>CNPJ</Label>
                            <div style={{ position: "relative" }}>
                                <Input
                                    name="cnpj"
                                    placeholder="00.000.000/0000-00"
                                    value={form.cnpj}
                                    onChange={(e) =>
                                        setForm({
                                            ...form,
                                            cnpj: formatCnpj(e.target.value),
                                        })
                                    }
                                    onBlur={handleCnpjBlur}
                                />
                                {cnpjLoading && (
                                    <span
                                        style={{
                                            position: "absolute",
                                            right: "12px",
                                            top: "50%",
                                            transform: "translateY(-50%)",
                                            fontSize: "12px",
                                            color: "#888",
                                        }}
                                    >
                                        Buscando...
                                    </span>
                                )}
                            </div>
                            {cnpjError && (
                                <p className="text-red-500 text-sm mt-1">
                                    {cnpjError}
                                </p>
                            )}
                            {errors.cnpj && (
                                <p className="text-red-500 text-sm mt-1">
                                    {errors.cnpj[0]}
                                </p>
                            )}
                            <p className="text-gray-400 text-xs mt-1">
                                Digite o CNPJ para preencher os dados
                                automaticamente
                            </p>
                        </div>
                    )}

                    {/* CPF — só PF */}
                    {form.tipo === "PF" && (
                        <div>
                            <Label>CPF</Label>
                            <Input
                                name="cpf"
                                placeholder="000.000.000-00"
                                value={form.cpf}
                                onChange={(e) =>
                                    setForm({
                                        ...form,
                                        cpf: formatCpf(e.target.value),
                                    })
                                }
                            />
                            {errors.cpf && (
                                <p className="text-red-500 text-sm mt-1">
                                    {errors.cpf[0]}
                                </p>
                            )}
                        </div>
                    )}

                    {/* Nome + Razão Social (só PJ) */}
                    <div
                        style={{
                            display: "grid",
                            gridTemplateColumns:
                                form.tipo === "PJ" ? "1fr 1fr" : "1fr",
                            gap: "16px",
                        }}
                    >
                        <div>
                            <Label>
                                Nome{" "}
                                {form.tipo === "PF" ? "Completo" : "do Cliente"}
                            </Label>
                            <Input
                                name="nome"
                                placeholder="Nome"
                                value={form.nome}
                                onChange={handleChange}
                            />
                            {errors.nome && (
                                <p className="text-red-500 text-sm mt-1">
                                    {errors.nome[0]}
                                </p>
                            )}
                        </div>
                        {form.tipo === "PJ" && (
                            <div>
                                <Label>Razão Social</Label>
                                <Input
                                    name="razao_social"
                                    placeholder="Razão Social"
                                    value={form.razao_social}
                                    onChange={handleChange}
                                />
                            </div>
                        )}
                    </div>

                    {/* Telefone + Email */}
                    <div
                        style={{
                            display: "grid",
                            gridTemplateColumns: "1fr 1fr",
                            gap: "16px",
                        }}
                    >
                        <div>
                            <Label>Telefone (com DDD)</Label>
                            <Input
                                name="telefone"
                                placeholder="(00) 00000-0000"
                                value={form.telefone}
                                onChange={(e) =>
                                    setForm({
                                        ...form,
                                        telefone: formatTelefone(
                                            e.target.value,
                                        ),
                                    })
                                }
                            />
                        </div>
                        <div>
                            <Label>E-mail</Label>
                            <Input
                                name="email"
                                type="email"
                                placeholder="email@empresa.com"
                                value={form.email}
                                onChange={handleChange}
                            />
                            {errors.email && (
                                <p className="text-red-500 text-sm mt-1">
                                    {errors.email[0]}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Endereço */}
                    <div>
                        <Label>Endereço</Label>
                        <Input
                            name="endereco"
                            placeholder="Rua, número, complemento, bairro"
                            value={form.endereco}
                            onChange={handleChange}
                        />
                    </div>

                    {/* Cidade + Estado + CEP */}
                    <div
                        style={{
                            display: "grid",
                            gridTemplateColumns: "2fr 1fr 1fr",
                            gap: "16px",
                        }}
                    >
                        <div>
                            <Label>Cidade</Label>
                            <Input
                                name="cidade"
                                placeholder="Cidade"
                                value={form.cidade}
                                onChange={handleChange}
                            />
                        </div>
                        <div>
                            <Label>Estado</Label>
                            <Input
                                name="estado"
                                placeholder="UF"
                                maxLength={2}
                                value={form.estado}
                                onChange={handleChange}
                            />
                        </div>
                        <div>
                            <Label>CEP</Label>
                            <Input
                                name="cep"
                                placeholder="00000-000"
                                value={form.cep}
                                onChange={(e) =>
                                    setForm({
                                        ...form,
                                        cep: formatCep(e.target.value),
                                    })
                                }
                                onBlur={handleCepBlur}
                            />
                        </div>
                    </div>

                    {/* Senha */}
                    <div
                        style={{
                            display: "grid",
                            gridTemplateColumns: "1fr 1fr",
                            gap: "16px",
                        }}
                    >
                        <div>
                            <Label>
                                {isEdit ? "Nova Senha" : "Senha"}{" "}
                                {isEdit && (
                                    <span className="text-gray-400 text-xs">
                                        (deixe em branco para não alterar)
                                    </span>
                                )}
                            </Label>
                            <Input
                                name="password"
                                type="password"
                                value={form.password}
                                onChange={handleChange}
                            />
                            {errors.password && (
                                <p className="text-red-500 text-sm mt-1">
                                    {errors.password[0]}
                                </p>
                            )}
                        </div>
                        <div>
                            <Label>Confirmar Senha</Label>
                            <Input
                                name="password_confirmation"
                                type="password"
                                value={form.password_confirmation}
                                onChange={handleChange}
                            />
                        </div>
                    </div>

                    <Button
                        className="w-full text-white"
                        onClick={handleSubmit}
                        disabled={loading}
                    >
                        {loading
                            ? "Salvando..."
                            : isEdit
                              ? "Salvar Alterações"
                              : "Cadastrar Cliente"}
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
