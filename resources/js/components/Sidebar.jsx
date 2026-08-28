import React from "react"

export default function Sidebar() {
    const user = window.authUser
    const isAdmin =
        user?.role === "admin" ||
        user?.role === "Admin" ||
        user?.role_id === 1 ||
        user?.role_id === "1"
    const currentPath = window.location.pathname

    return (
        <aside style={{
            width: "240px",
            height: "100vh",
            position: "fixed",
            left: 0,
            top: 0,
            backgroundColor: "#0f172a",
            color: "#f8fafc",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "24px 16px",
            boxSizing: "border-box",
            zIndex: 1000,
            fontFamily: "'DM Sans', sans-serif"
        }}>
            <div>
                <div style={{ padding: "0 12px", marginBottom: "28px" }}>
                    <h1 style={{ fontSize: "22px", fontWeight: "800", letterSpacing: "-0.5px", margin: 0, color: "#ffffff" }}>
                        zLuz
                    </h1>
                    <span style={{ fontSize: "11px", color: "#647486", textTransform: "uppercase", letterSpacing: "1px", fontWeight: "600" }}>
                        {isAdmin ? "Painel Administrativo" : "Loja Online"}
                    </span>
                </div>

                <nav style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    <a href="/" style={getItemStyle(currentPath === "/")}>
                        <i className="fas fa-store" style={{ width: "20px", textAlign: "center" }}></i>
                        <span>Loja</span>
                    </a>

                    <a href="/admin/dashboard" style={getItemStyle(currentPath.startsWith("/admin/dashboard"))}>
                        <i className="fas fa-bar-chart" style={{ width: "20px", textAlign: "center" }}></i>
                        <span>Dashboard</span>
                    </a>

                    {isAdmin && (
                        <>
                            <div style={{
                                marginTop: "20px",
                                marginBottom: "8px",
                                padding: "0 12px",
                                fontSize: "10px",
                                fontWeight: "700",
                                color: "#475569",
                                textTransform: "uppercase",
                                letterSpacing: "1.2px"
                            }}>
                                Gestão
                            </div>
                            <a href="/admin/produtos" style={getItemStyle(currentPath.startsWith("/admin/produtos"))}>
                                <i className="fas fa-box-open" style={{ width: "20px", textAlign: "center" }}></i>
                                <span>Produtos</span>
                            </a>
                            <a href="/admin/categorias" style={getItemStyle(currentPath.startsWith("/admin/categorias"))}>
                                <i className="fas fa-tags" style={{ width: "20px", textAlign: "center" }}></i>
                                <span>Categorias</span>
                            </a>

                        </>
                    )}
                </nav>
            </div>

            <div style={{ borderTop: "1px solid #1e293b", paddingTop: "16px" }}>
                <div style={{ padding: "0 12px", marginBottom: "12px" }}>
                    <p style={{ margin: 0, fontSize: "13px", fontWeight: "600", color: "#f1f5f9" }}>
                        {user?.username ?? "Usuario"}
                    </p>
                    <span style={{
                        display: "inline-block",
                        fontSize: "10px",
                        padding: "2px 8px",
                        borderRadius: "10px",
                        background: isAdmin ? "rgba(56, 189, 248, 0.15)" : "rgba(148, 163, 184, 0.15)",
                        color: isAdmin ? "#38bdf8" : "#94a3b8",
                        fontWeight: "600",
                        marginTop: "4px"
                    }}>
                        {isAdmin ? "ADMIN" : "CLIENTE"}
                    </span>
                </div>

                <a href="/logout"
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        padding: "10px 12px",
                        color: "#f87171",
                        textDecoration: "none",
                        borderRadius: "8px",
                        fontSize: "13px",
                        fontWeight: "500",
                        transition: "background 0.2s"
                    }}>
                    <i className="fas fa-sign-out-alt" style={{ width: "20px", textAlign: "center" }}></i>
                    <span>Sair da conta</span>
                </a>
            </div>
        </aside>
    )
}

function getItemStyle(isActive) {
    return {
        display: "flex",
        alignItems: "center",
        gap: "12px",
        padding: "10px 12px",
        borderRadius: "8px",
        fontSize: "13px",
        fontWeight: isActive ? "600" : "500",
        color: isActive ? "#ffffff" : "#94a3b8",
        backgroundColor: isActive ? "#1e293b" : "transparent",
        textDecoration: "none",
        transition: "all 0.2s ease"
    }
}