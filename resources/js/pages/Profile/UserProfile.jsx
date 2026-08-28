import { useState, useMemo, useEffect } from "react"
import axios from "axios"

const csrf = () => document.querySelector('meta[name="csrf-token"]').content
const brl = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

const statusLabel = {
    pending: { text: 'Aguardando pagamento', color: '#b45309', bg: '#fffbeb' },
    paid: { text: 'Pago', color: '#166534', bg: '#f0fdf4' },
    expired: { text: 'Expirado', color: '#991b1b', bg: '#fef2f2' },
    canceled: { text: 'Cancelado', color: '#991b1b', bg: '#fef2f2' },
}


function getPasswordStrength(password) {
    if (!password) return { score: 0, label: "", color: "" }
    let score = 0
    if (password.length >= 8) score++
    if (password.length >= 12) score++
    if (/[A-Z]/.test(password)) score++
    if (/[a-z]/.test(password)) score++
    if (/\d/.test(password)) score++
    if (/[^A-Za-z0-9]/.test(password)) score++

    if (score <= 2) return { score, label: "Fraca", color: "#b91c1c" }
    if (score <= 4) return { score, label: "Média", color: "#b45309" }
    return { score, label: "Forte", color: "#166534" }
}

export default function UserProfile() {
    const user = window.authUser ?? {}
    const email = window.authEmail ?? ""
    const [tab, setTab] = useState("pedidos")

    // ---- Pedidos ----
    const [orders, setOrders] = useState(null)
    const [ordersError, setOrdersError] = useState("")

    useEffect(() => {
        axios.get('/api/meus-pedidos')
            .then(res => setOrders(res.data))
            .catch(() => setOrdersError('Não foi possível carregar seus pedidos.'))
    }, [])
    const [cancelingCode, setCancelingCode] = useState(null)

    async function handleCancelOrder(code) {
        if (!confirm(`Cancelar o pedido ${code}? Essa ação não pode ser desfeita.`)) return

        setCancelingCode(code)
        try {
            await axios.post(`/api/meus-pedidos/${code}/cancelar`, {}, {
                headers: { "X-CSRF-TOKEN": csrf() },
            })
            setOrders(prev => prev.map(o => o.code === code ? { ...o, status: 'canceled' } : o))
        } catch (err) {
            alert(err.response?.data?.message ?? "Não foi possível cancelar o pedido.")
        } finally {
            setCancelingCode(null)
        }
    }

    // ---- Senha ----
    const [passForm, setPassForm] = useState({
        current_password: "", new_password: "", new_password_confirmation: "",
    })
    const [passErrors, setPassErrors] = useState({})
    const [passSuccess, setPassSuccess] = useState("")
    const [passError, setPassError] = useState("")
    const [passSaving, setPassSaving] = useState(false)
    const [showPasswords, setShowPasswords] = useState(false)

    const strength = useMemo(() => getPasswordStrength(passForm.new_password), [passForm.new_password])

    async function handleChangePassword(e) {
        e.preventDefault()
        setPassSaving(true)
        setPassErrors({}); setPassSuccess(""); setPassError("")
        try {
            await axios.post("/profile/password", passForm, { headers: { "X-CSRF-TOKEN": csrf() } })
            setPassSuccess("Senha alterada com sucesso!")
            setPassForm({ current_password: "", new_password: "", new_password_confirmation: "" })
            setTimeout(() => setPassSuccess(""), 5000)
        } catch (err) {
            if (err.response?.status === 422) setPassErrors(err.response.data.errors ?? {})
            else if (err.response?.status === 400) setPassError(err.response.data.message ?? "Senha atual incorreta.")
            else setPassError("Erro ao alterar senha.")
        } finally {
            setPassSaving(false)
        }
    }

    // ---- Eliminar conta ----
    const [deleteConfirm, setDeleteConfirm] = useState("")
    const [deleteError, setDeleteError] = useState("")
    const [deleting, setDeleting] = useState(false)

    async function handleDeleteAccount(e) {
        e.preventDefault()
        if (deleteConfirm !== "ELIMINAR") {
            setDeleteError("É obrigatório escrever a palavra ELIMINAR")
            return
        }
        if (!confirm("Tem certeza? Esta ação é irreversível e todos os seus dados serão removidos!")) return
        setDeleting(true)
        setDeleteError("")
        try {
            await axios.delete("/profile/account", {
                headers: { "X-CSRF-TOKEN": csrf() },
                data: { deleted_confirmation: deleteConfirm },
            })
            window.location.href = "/login"
        } catch (err) {
            setDeleteError(err.response?.data?.message ?? "Erro ao eliminar conta.")
            setDeleting(false)
        }
    }

    const initials = user.username?.[0]?.toUpperCase() ?? "U"

    return (
        <div style={{ fontFamily: "var(--font-body)", background: "var(--bg)", minHeight: "100vh", color: "var(--ink)" }}>
            <div style={{ maxWidth: "760px", margin: "0 auto", padding: "48px 24px 96px" }}>

                {/* Cabeçalho */}
                <div style={{ display: "flex", alignItems: "center", gap: "20px", marginBottom: "48px" }}>
                    <div style={{
                        width: "64px", height: "64px", borderRadius: "50%",
                        background: "var(--ink)", display: "flex", alignItems: "center",
                        justifyContent: "center", color: "#fff", fontSize: "22px",
                        fontFamily: "var(--font-display)", fontStyle: "italic", flexShrink: 0,
                    }}>
                        {initials}
                    </div>
                    <div>
                        <h1 style={{
                            fontFamily: "var(--font-display)", fontStyle: "italic", fontWeight: 500,
                            fontSize: "28px", margin: "0 0 4px", lineHeight: 1.1,
                        }}>
                            {user.username}
                        </h1>
                        <p style={{ margin: 0, fontSize: "13px", color: "#888", fontFamily: "var(--font-mono)" }}>
                            {email || "—"}
                        </p>
                    </div>
                </div>

                {/* Abas */}
                <div style={{ display: "flex", gap: "8px", borderBottom: "1px solid var(--border, #E5E5E5)", marginBottom: "40px" }}>
                    {[
                        { id: "pedidos", label: "Meus Pedidos" },
                        { id: "senha", label: "Alterar Senha" },
                        { id: "conta", label: "Minha Conta" },
                    ].map(t => (
                        <button
                            key={t.id}
                            onClick={() => setTab(t.id)}
                            style={{
                                background: "none", border: "none", cursor: "pointer",
                                padding: "12px 4px", marginRight: "24px",
                                fontFamily: "var(--font-mono)", fontSize: "12px",
                                textTransform: "uppercase", letterSpacing: "0.06em",
                                color: tab === t.id ? "var(--ink)" : "#999",
                                borderBottom: tab === t.id ? "2px solid var(--ink)" : "2px solid transparent",
                            }}
                        >
                            {t.label}
                        </button>
                    ))}
                </div>

                {/* ---- ABA: PEDIDOS ---- */}
                {tab === "pedidos" && (
                    <div>
                        {ordersError && <p style={{ color: "#b91c1c", fontSize: "13px" }}>{ordersError}</p>}

                        {!orders && !ordersError && (
                            <p style={{ fontSize: "13px", color: "#888", fontFamily: "var(--font-mono)" }}>Carregando pedidos...</p>
                        )}

                        {orders && orders.length === 0 && (
                            <div style={{ textAlign: "center", padding: "64px 0" }}>
                                <p style={{ fontSize: "14px", color: "#888", marginBottom: "20px" }}>
                                    Você ainda não fez nenhum pedido.
                                </p>
                                <a href="/#produtos" style={{
                                    display: "inline-block", padding: "14px 28px",
                                    background: "var(--ink)", color: "#fff", textDecoration: "none",
                                    fontFamily: "var(--font-mono)", fontSize: "12px",
                                    letterSpacing: "0.06em", textTransform: "uppercase",
                                }}>
                                    Ver produtos
                                </a>
                            </div>
                        )}

                        {orders && orders.length > 0 && orders.map(order => {
                            const st = statusLabel[order.status] ?? { text: order.status, color: "#555", bg: "#f4f4f0" }
                            return (
                                <div key={order.code} style={{
                                    border: "1px solid var(--border, #E5E5E5)", borderRadius: "2px",
                                    padding: "20px 24px", marginBottom: "16px",
                                }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                                        <div>
                                            <p style={{ margin: "0 0 2px", fontFamily: "var(--font-mono)", fontSize: "13px", fontWeight: 600 }}>
                                                Pedido {order.code}
                                            </p>
                                            <p style={{ margin: 0, fontSize: "12px", color: "#888" }}>
                                                {new Date(order.created_at).toLocaleDateString('pt-BR')}
                                            </p>
                                        </div>
                                        <span style={{
                                            fontSize: "11px", fontFamily: "var(--font-mono)",
                                            textTransform: "uppercase", letterSpacing: "0.04em",
                                            padding: "5px 10px", borderRadius: "999px",
                                            background: st.bg, color: st.color,
                                        }}>
                                            {st.text}
                                        </span>
                                    </div>

                                    <div style={{ borderTop: "1px solid var(--border, #E5E5E5)", paddingTop: "12px" }}>
                                        {order.items.map((i, idx) => (
                                            <div key={idx} style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", padding: "4px 0", color: "#555" }}>
                                                <span>{i.quantity}× {i.name}{i.size && ` · ${i.size}`}</span>
                                            </div>
                                        ))}
                                    </div>


                                    {order.tracking_code && (
                                        <p style={{ fontSize: "12px", color: "#1d4ed8", margin: "10px 0 0" }}>
                                            Código de rastreio: <strong>{order.tracking_code}</strong>
                                        </p>
                                    )}
                                    <div style={{
                                        display: "flex", justifyContent: "space-between", alignItems: "center",
                                        borderTop: "1px solid var(--border, #E5E5E5)", marginTop: "12px", paddingTop: "12px",
                                    }}>
                                        <span style={{ fontSize: "13px", fontWeight: 600 }}>Total</span>
                                        <span style={{ fontFamily: "var(--font-mono)", fontSize: "15px", fontWeight: 600 }}>
                                            {brl(order.total)}
                                        </span>
                                    </div>
                                    <div style={{
                                        display: "flex", justifyContent: "space-between", alignItems: "center",
                                        borderTop: "1px solid var(--border, #E5E5E5)", marginTop: "12px", paddingTop: "12px",
                                    }}>
                                        <span style={{ fontSize: "13px", fontWeight: 600 }}>Total</span>
                                        <span style={{ fontFamily: "var(--font-mono)", fontSize: "15px", fontWeight: 600 }}>
                                            {brl(order.total)}
                                        </span>
                                    </div>

                                    {order.status === 'pending' && (
                                        <button
                                            onClick={() => handleCancelOrder(order.code)}
                                            disabled={cancelingCode === order.code}
                                            style={{
                                                width: "100%", marginTop: "14px", padding: "10px",
                                                background: "none", border: "1px solid #f3c8c8",
                                                color: "#b91c1c", fontFamily: "var(--font-mono)",
                                                fontSize: "11px", letterSpacing: "0.04em",
                                                textTransform: "uppercase", cursor: cancelingCode === order.code ? "default" : "pointer",
                                                opacity: cancelingCode === order.code ? 0.6 : 1,
                                            }}
                                        >
                                            {cancelingCode === order.code ? "Cancelando..." : "Cancelar pedido"}
                                        </button>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                )}

                {/* ---- ABA: SENHA ---- */}
                {tab === "senha" && (
                    <div>
                        {passSuccess && (
                            <p style={{ fontSize: "13px", color: "#166534", background: "#f0fdf4", padding: "10px 14px", marginBottom: "16px" }}>
                                {passSuccess}
                            </p>
                        )}
                        {passError && (
                            <p style={{ fontSize: "13px", color: "#b91c1c", background: "#fef2f2", padding: "10px 14px", marginBottom: "16px" }}>
                                {passError}
                            </p>
                        )}

                        <div style={{ marginBottom: "16px" }}>
                            <label style={labelStyle}>Senha atual</label>
                            <input
                                type={showPasswords ? "text" : "password"}
                                value={passForm.current_password}
                                onChange={e => setPassForm(p => ({ ...p, current_password: e.target.value }))}
                                style={inputStyle}
                            />
                            {passErrors.current_password && <p style={errStyle}>{passErrors.current_password[0]}</p>}
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "12px" }}>
                            <div>
                                <label style={labelStyle}>Nova senha</label>
                                <input
                                    type={showPasswords ? "text" : "password"}
                                    value={passForm.new_password}
                                    onChange={e => setPassForm(p => ({ ...p, new_password: e.target.value }))}
                                    style={inputStyle}
                                />
                                {passErrors.new_password && <p style={errStyle}>{passErrors.new_password[0]}</p>}
                            </div>
                            <div>
                                <label style={labelStyle}>Confirmar nova senha</label>
                                <input
                                    type={showPasswords ? "text" : "password"}
                                    value={passForm.new_password_confirmation}
                                    onChange={e => setPassForm(p => ({ ...p, new_password_confirmation: e.target.value }))}
                                    style={inputStyle}
                                />
                                {passErrors.new_password_confirmation && <p style={errStyle}>{passErrors.new_password_confirmation[0]}</p>}
                            </div>
                        </div>

                        <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "#666", marginBottom: "16px", cursor: "pointer" }}>
                            <input type="checkbox" checked={showPasswords} onChange={() => setShowPasswords(v => !v)} />
                            Mostrar senhas
                        </label>

                        {passForm.new_password.length > 0 && (
                            <div style={{ marginBottom: "20px" }}>
                                <div style={{ display: "flex", gap: "4px", marginBottom: "4px" }}>
                                    {[1, 2, 3, 4, 5, 6].map(i => (
                                        <div key={i} style={{
                                            flex: 1, height: "3px",
                                            background: i <= strength.score ? strength.color : "#e5e5e5",
                                        }} />
                                    ))}
                                </div>
                                <p style={{ margin: 0, fontSize: "12px", color: strength.color, fontFamily: "var(--font-mono)" }}>
                                    Força: {strength.label}
                                </p>
                            </div>
                        )}

                        <p style={{ fontSize: "12px", color: "#888", marginBottom: "24px" }}>
                            Mínimo 8 caracteres, com letras maiúsculas, minúsculas e números.
                        </p>

                        <button
                            onClick={handleChangePassword}
                            disabled={passSaving}
                            style={{
                                width: "100%", padding: "15px", background: "var(--ink)", color: "#fff",
                                border: "none", fontFamily: "var(--font-mono)", fontSize: "12px",
                                letterSpacing: "0.06em", textTransform: "uppercase",
                                cursor: passSaving ? "default" : "pointer", opacity: passSaving ? 0.6 : 1,
                            }}
                        >
                            {passSaving ? "Salvando..." : "Alterar Senha"}
                        </button>
                    </div>
                )}

                {/* ---- ABA: CONTA / ZONA DE PERIGO ---- */}
                {tab === "conta" && (
                    <div>
                        <div style={{ border: "1px solid #f3c8c8", padding: "20px 24px", marginBottom: "20px" }}>
                            <p style={{ fontSize: "13px", color: "#555", lineHeight: 1.7, margin: 0 }}>
                                A eliminação da conta é <strong>permanente e irreversível</strong>. Todos os
                                seus dados serão removidos do sistema sem possibilidade de recuperação.
                                Para confirmar, escreva <strong>ELIMINAR</strong> abaixo.
                            </p>
                        </div>

                        <label style={labelStyle}>Confirmação</label>
                        <input
                            placeholder="Digite ELIMINAR para confirmar"
                            value={deleteConfirm}
                            onChange={e => { setDeleteConfirm(e.target.value); setDeleteError("") }}
                            style={{ ...inputStyle, marginBottom: "8px" }}
                        />
                        {deleteError && <p style={errStyle}>{deleteError}</p>}

                        <button
                            onClick={handleDeleteAccount}
                            disabled={deleting || deleteConfirm !== "ELIMINAR"}
                            style={{
                                width: "100%", padding: "15px", marginTop: "16px",
                                background: deleteConfirm === "ELIMINAR" ? "#b91c1c" : "#f8f0f0",
                                color: deleteConfirm === "ELIMINAR" ? "#fff" : "#b91c1c",
                                border: "1px solid #f3c8c8", fontFamily: "var(--font-mono)", fontSize: "12px",
                                letterSpacing: "0.06em", textTransform: "uppercase",
                                cursor: deleteConfirm === "ELIMINAR" && !deleting ? "pointer" : "not-allowed",
                                opacity: deleting ? 0.6 : 1,
                            }}
                        >
                            {deleting ? "Eliminando..." : "Eliminar Conta Permanentemente"}
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}

const labelStyle = {
    display: "block", fontSize: "11px", fontFamily: "var(--font-mono)",
    textTransform: "uppercase", letterSpacing: "0.05em", color: "#777", marginBottom: "8px",
}
const inputStyle = {
    width: "100%", padding: "12px 14px", fontSize: "14px",
    border: "1px solid var(--border, #E5E5E5)", borderRadius: "2px",
    outline: "none", boxSizing: "border-box", fontFamily: "var(--font-body)",
}
const errStyle = { color: "#b91c1c", fontSize: "11px", margin: "5px 0 0" }