import React, { useState } from "react"

export default function Login({ csrfToken, initialError, initialSuccess, initialDeleted }) {
    const [username, setUsername] = useState("")
    const [password, setPassword] = useState("")

    return (
        <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "80vh",
            padding: "40px 20px",
            background: "var(--bg)",
            fontFamily: "var(--font-body)"
        }}>
            <div style={{
                width: "100%",
                maxWidth: "420px",
                background: "#ffffff",
                padding: "40px",
                borderRadius: "4px",
                boxShadow: "0 4px 20px rgba(0, 0, 0, 0.05)",
                border: "1px solid var(--border, #e5e5e5)"
            }}>
                <div style={{ textAlign: "center", marginBottom: "32px" }}>
                    <h1 style={{
                        fontFamily: "var(--font-display)",
                        fontStyle: "italic",
                        fontSize: "28px",
                        fontWeight: "500",
                        color: "var(--ink)",
                        margin: "0 0 8px 0"
                    }}>
                        zLuz
                    </h1>
                    <p style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: "12px",
                        color: "#666",
                        letterSpacing: "0.05em",
                        textTransform: "uppercase",
                        margin: 0
                    }}>
                        Acessar sua conta
                    </p>
                </div>

                {initialError && (
                    <div style={{
                        background: "#fef2f2",
                        border: "1px solid #fecaca",
                        color: "#991b1b",
                        padding: "12px",
                        borderRadius: "2px",
                        fontSize: "13px",
                        marginBottom: "20px",
                        textAlign: "center"
                    }}>
                        {initialError}
                    </div>
                )}

                {initialSuccess && (
                    <div style={{
                        background: "#f0fdf4",
                        border: "1px solid #bbf7d0",
                        color: "#166534",
                        padding: "12px",
                        borderRadius: "2px",
                        fontSize: "13px",
                        marginBottom: "20px",
                        textAlign: "center"
                    }}>
                        {initialSuccess}
                    </div>
                )}

                {initialDeleted && (
                    <div style={{
                        background: "#f0fdf4",
                        border: "1px solid #bbf7d0",
                        color: "#166534",
                        padding: "12px",
                        borderRadius: "2px",
                        fontSize: "13px",
                        marginBottom: "20px",
                        textAlign: "center"
                    }}>
                        {initialDeleted}
                    </div>
                )}

                <form action="/login" method="POST" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                    <input type="hidden" name="_token" value={csrfToken} />

                    <div>
                        <label style={{
                            display: "block",
                            fontSize: "12px",
                            fontFamily: "var(--font-mono)",
                            color: "var(--ink)",
                            textTransform: "uppercase",
                            marginBottom: "6px"
                        }}>
                            Usuário
                        </label>
                        <input
                            type="text"
                            name="username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                            style={{
                                width: "100%",
                                padding: "12px",
                                border: "1px solid var(--border, #ccc)",
                                borderRadius: "2px",
                                fontSize: "14px",
                                outline: "none",
                                background: "#fafafa"
                            }}
                        />
                    </div>

                    <div>
                        <label style={{
                            display: "block",
                            fontSize: "12px",
                            fontFamily: "var(--font-mono)",
                            color: "var(--ink)",
                            textTransform: "uppercase",
                            marginBottom: "6px"
                        }}>
                            Senha
                        </label>
                        <input
                            type="password"
                            name="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            style={{
                                width: "100%",
                                padding: "12px",
                                border: "1px solid var(--border, #ccc)",
                                borderRadius: "2px",
                                fontSize: "14px",
                                outline: "none",
                                background: "#fafafa"
                            }}
                        />
                    </div>

                    <button
                        type="submit"
                        style={{
                            background: "var(--ink)",
                            color: "#ffffff",
                            padding: "14px",
                            border: "none",
                            borderRadius: "2px",
                            fontSize: "13px",
                            fontWeight: "600",
                            fontFamily: "var(--font-mono)",
                            letterSpacing: "0.08em",
                            textTransform: "uppercase",
                            cursor: "pointer",
                            marginTop: "10px",
                            transition: "opacity 0.2s"
                        }}
                    >
                        Entrar
                    </button>
                </form>
            </div>
        </div>
    )
}