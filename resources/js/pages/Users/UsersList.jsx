import { useState, useEffect } from "react"
import axios from "axios"

const csrf = () => document.querySelector('meta[name="csrf-token"]').content

export default function UsersList() {
    const [users, setUsers]     = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError]     = useState("")

    useEffect(() => {
        fetchUsers()
    }, [])

    async function fetchUsers() {
        try {
            const res = await axios.get("/users/data")
            setUsers(res.data)
        } catch {
            setError("Erro ao carregar usuários.")
        } finally
         {
            setLoading(false)
        }
    }

    async function handleToggle(id) {
        try {
            const res = await axios.patch(`/users/${id}/toggle`, {}, {
                headers: { "X-CSRF-TOKEN": csrf() }
            })
            setUsers(users.map(u => u.id === id ? { ...u, active: res.data.active } : u))
        } catch {
            alert("Erro ao atualizar status.")
        }
    }

    async function handleDelete(id) {
        if (!confirm("Tem certeza que deseja deletar este usuário?")) return
        try {
            await axios.delete(`/users/${id}`, {
                headers: { "X-CSRF-TOKEN": csrf() }
            })
            setUsers(users.filter(u => u.id !== id))
        } catch {
            alert("Erro ao deletar usuário.")
        }
    }

    if (loading) return (
        <div style={{ display: "flex", justifyContent: "center", padding: "60px", color: "#888", fontFamily: "DM Sans, sans-serif" }}>
            Carregando usuários...
        </div>
    )

    if (error) return (
        <div style={{ padding: "20px", color: "#e63946", fontFamily: "DM Sans, sans-serif" }}>{error}</div>
    )

    return (
        <div style={{ fontFamily: "'DM Sans', sans-serif", padding: "8px" }}>

            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
                <div>
                    <h1 style={{ fontSize: "22px", fontWeight: "700", color: "#111", margin: 0 }}>Usuários</h1>
                    <p style={{ color: "#888", fontSize: "13px", margin: "4px 0 0" }}>{users.length} usuário(s) cadastrado(s)</p>
                </div>
                <a
                    href="/create_admin"
                    style={{
                        background: "#e63946", color: "#fff", padding: "10px 20px",
                        borderRadius: "8px", textDecoration: "none", fontSize: "14px",
                        fontWeight: "600", display: "flex", alignItems: "center", gap: "8px"
                    }}
                >
                    <i className="fas fa-user-plus" />
                    Novo Usuário
                </a>
            </div>

            {/* Cards Grid */}
            <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                gap: "16px"
            }}>
                {users.map(user => (
                    <div key={user.id} style={{
                        background: "#fff",
                        border: "1px solid #eee",
                        borderRadius: "12px",
                        padding: "20px",
                        boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                        display: "flex",
                        flexDirection: "column",
                        gap: "12px",
                    }}>
                        {/* Avatar + Info */}
                        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                            <div style={{
                                width: "44px", height: "44px", borderRadius: "50%",
                                background: user.active ? "#e63946" : "#ccc",
                                display: "flex", alignItems: "center", justifyContent: "center",
                                color: "#fff", fontWeight: "700", fontSize: "16px", flexShrink: 0,
                            }}>
                                {user.username?.[0]?.toUpperCase()}
                            </div>
                            <div style={{ overflow: "hidden" }}>
                                <p style={{ margin: 0, fontWeight: "600", fontSize: "15px", color: "#111", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                    {user.name ?? user.username}
                                </p>
                                <p style={{ margin: 0, fontSize: "12px", color: "#888", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                    {user.email}
                                </p>
                            </div>
                        </div>

                        {/* Badge status */}
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <span style={{
                                padding: "3px 10px", borderRadius: "999px", fontSize: "11px", fontWeight: "600",
                                background: user.active ? "#dcfce7" : "#fee2e2",
                                color: user.active ? "#16a34a" : "#dc2626",
                            }}>
                                {user.active ? "Ativo" : "Inativo"}
                            </span>
                            {user.role && (
                                <span style={{
                                    padding: "3px 10px", borderRadius: "999px", fontSize: "11px",
                                    background: "#f1f5f9", color: "#475569", fontWeight: "500"
                                }}>
                                    {user.role.nome}
                                </span>
                            )}
                        </div>

                        {/* Ações */}
                        <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
                            <a
                                href={`/users/${user.id}/edit`}
                                style={{
                                    flex: 1, textAlign: "center", padding: "8px",
                                    borderRadius: "8px", border: "1px solid #e2e8f0",
                                    color: "#475569", textDecoration: "none", fontSize: "13px",
                                    fontWeight: "500", transition: "all 0.15s"
                                }}
                            >
                                <i className="fas fa-pen me-1" /> Editar
                            </a>

                            <button
                                onClick={() => handleToggle(user.id)}
                                style={{
                                    flex: 1, padding: "8px", borderRadius: "8px", cursor: "pointer",
                                    border: `1px solid ${user.active ? "#fca5a5" : "#86efac"}`,
                                    background: user.active ? "#fff1f2" : "#f0fdf4",
                                    color: user.active ? "#dc2626" : "#16a34a",
                                    fontSize: "13px", fontWeight: "500", transition: "all 0.15s"
                                }}
                            >
                                <i className={`fas ${user.active ? "fa-ban" : "fa-check"} me-1`} />
                                {user.active ? "Bloquear" : "Ativar"}
                            </button>

                            <button
                                onClick={() => handleDelete(user.id)}
                                style={{
                                    padding: "8px 12px", borderRadius: "8px", cursor: "pointer",
                                    border: "1px solid #fca5a5", background: "#fff1f2",
                                    color: "#dc2626", fontSize: "13px", transition: "all 0.15s"
                                }}
                            >
                                <i className="fas fa-trash" />
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {users.length === 0 && (
                <div style={{ textAlign: "center", padding: "60px", color: "#aaa" }}>
                    <i className="fas fa-users" style={{ fontSize: "40px", marginBottom: "12px", display: "block" }} />
                    Nenhum usuário cadastrado ainda.
                </div>
            )}
        </div>
    )
}