import React, { useState } from "react"

export default function Sidebar() {
    const [open, setOpen] = useState(false)
    const user = window.authUser
    const isAdmin =
        user?.role === "admin" ||
        user?.role === "Admin" ||
        user?.role_id === 1 ||
        user?.role_id === "1"
    const currentPath = window.location.pathname

    return (
        <>
            <button
                type="button"
                onClick={() => setOpen(true)}
                className="md:hidden fixed top-4 left-4 z-[1050] w-10 h-10 flex items-center justify-center rounded-md bg-[#0f172a] text-white"
            >
                <i className="fas fa-bars"></i>
            </button>

            {open && (
                <div
                    className="md:hidden fixed inset-0 z-[1040] bg-black/50"
                    onClick={() => setOpen(false)}
                />
            )}

            <aside
                className={`fixed md:translate-x-0 transition-transform duration-200 ${open ? "translate-x-0" : "-translate-x-full"}`}
                style={{
                    width: "240px",
                    height: "100vh",
                    left: 0,
                    top: 0,
                    backgroundColor: "#0f172a",
                    color: "#f8fafc",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    padding: "24px 16px",
                    boxSizing: "border-box",
                    zIndex: 1045,
                    fontFamily: "'DM Sans', sans-serif"
                }}
            >
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
                            <i className="fas fa-chart-simple" style={{ width: "20px", textAlign: "center" }}></i>
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
                                <a href="/admin/pedidos" style={getItemStyle(currentPath.startsWith("/admin/pedidos"))}>
                                    <i className="fas fa-receipt" style={{ width: "20px", textAlign: "center" }}></i>
                                    <span>Pedidos</span>
                                </a>

                                <a href="/admin/produtos" style={getItemStyle(currentPath.startsWith("/admin/produtos"))}>
                                    <i className="fas fa-box-open" style={{ width: "20px", textAlign: "center" }}></i>
                                    <span>Produtos</span>
                                </a>
                                <a href="/admin/categorias" style={getItemStyle(currentPath.startsWith("/admin/categorias"))}>
                                    <i className="fas fa-tags" style={{ width: "20px", textAlign: "center" }}></i>
                                    <span>Categorias</span>
                                </a>
                                <a href="/admin/cupons" style={getItemStyle(currentPath.startsWith("/admin/cupons"))}>
                                    <i className="fas fa-ticket-alt" style={{ width: "20px", textAlign: "center" }}></i>
                                    <span>Cupons</span>
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

                    <form method="POST" action="/logout">
                        <input type="hidden" name="_token" value={document.querySelector('meta[name="csrf-token"]')?.content} />
                        <button type="submit" className="block w-full text-left px-4 py-2.5 text-sm text-red-700 bg-transparent border-0 cursor-pointer">Sair da conta</button>
                    </form>
                </div>
            </aside>
        </>
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