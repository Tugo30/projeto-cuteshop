import { useState, useEffect } from "react"
import axios from "axios"
import Navbar from "./Navbar"
import HomeCarousels from "@/components/HomeCarousels"

const CATEGORIES = ["Todos", "Camisetas", "Calças", "Acessórios", "Novidades"]

function getDisplayPrice(product) {
    if (!product.variants || product.variants.length === 0) return null
    const prices = product.variants.map(v => Number(v.price))
    return Math.min(...prices)
}

export default function Home() {
    const [products, setProducts] = useState([])
    const [loading, setLoading] = useState(true)
    const [category, setCategory] = useState("Todos")


    // Estado para controlar a visibilidade do Modal de Autenticação
    const [authModalOpen, setAuthModalOpen] = useState(false)

    useEffect(() => {
        axios.get("/produtos/data")
            .then(res => setProducts(res.data))
            .finally(() => setLoading(false))
    }, [])

    const filtered = category === "Todos"
        ? products
        : products.filter(p => p.category === category)

    return (
        <div style={{ fontFamily: "var(--font-body)", background: "var(--bg)", minHeight: "100vh", width: "100%" }}>
            {/* Passamos a função de abrir o modal para a Navbar */}
            <Navbar onOpenAuth={() => setAuthModalOpen(true)} />

            {/* Modal de Autenticação (Login / Cadastro) */}
            {authModalOpen && <AuthModal onClose={() => setAuthModalOpen(false)} />}

            {/* Hero — Fundo 100% da tela */}
            <section
                style={{
                    position: "relative",
                    padding: "96px 48px 120px",
                    background: "var(--bg)",
                    clipPath: "polygon(0 0, 100% 0, 100% 88%, 0 100%)",
                    width: "100%",
                }}
            >
                {/* Conteúdo do Hero limitado e centralizado */}
                <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
                    <p style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: "13px",
                        letterSpacing: "0.12em",
                        color: "var(--accent)",
                        textTransform: "uppercase",
                        margin: "0 0 16px",
                    }}>
                        zLuz — nova coleção
                    </p>

                    <h1 style={{
                        fontFamily: "var(--font-display)",
                        fontStyle: "italic",
                        fontWeight: 500,
                        fontSize: "clamp(36px, 6vw, 68px)",
                        color: "var(--ink)",
                        lineHeight: 1.05,
                        margin: 0,
                        maxWidth: "720px",
                    }}>
                        Vista sua luz.
                    </h1>

                    <p style={{
                        fontSize: "16px",
                        color: "#555",
                        maxWidth: "460px",
                        margin: "24px 0 32px",
                        lineHeight: 1.6,
                    }}>
                        Peças selecionadas com atenção ao caimento, ao tecido e ao detalhe. Sem meio-termo.
                    </p>

                    <a
                        href="#produtos"
                        style={{
                            display: "inline-block",
                            background: "var(--ink)",
                            color: "#fff",
                            padding: "14px 28px",
                            borderRadius: "2px",
                            fontSize: "14px",
                            fontWeight: 600,
                            textDecoration: "none",
                            letterSpacing: "0.02em",
                        }}
                    >
                        Ver produtos
                    </a>
                </div>
            </section>
            
              <HomeCarousels products={products.slice(0, 8)} />

            {/* Seção de produtos — limitada e centralizada */}
            <section id="produtos" style={{ maxWidth: "1400px", margin: "0 auto", padding: "16px 48px 80px" }}>
                <div style={{ display: "flex", gap: "10px", marginBottom: "40px", flexWrap: "wrap" }}>
                    {CATEGORIES.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setCategory(cat)}
                            style={{
                                fontFamily: "var(--font-mono)",
                                fontSize: "13px",
                                padding: "8px 16px",
                                borderRadius: "999px",
                                border: `1px solid ${category === cat ? "var(--ink)" : "var(--border)"}`,
                                background: category === cat ? "var(--ink)" : "transparent",
                                color: category === cat ? "#fff" : "var(--ink)",
                                cursor: "pointer",
                                transition: "all .15s",
                            }}
                        >
                            {cat}
                        </button>
                    ))}
                </div>

                {loading ? (
                    <div style={{ textAlign: "center", padding: "80px", color: "#888", fontFamily: "var(--font-mono)" }}>
                        Carregando produtos...
                    </div>
                ) : filtered.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "80px", color: "#888" }}>
                        Nenhum produto nessa categoria ainda.
                    </div>
                ) : (
                    <div style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
                        gap: "28px",
                    }}>
                        {filtered.map(p => {
                            const cover = p.images?.length ? p.images[0].url : p.image

                            return (
                                <a key={p.id} href={`/produtos/${p.id}`} style={{ textDecoration: "none", color: "inherit" }}>
                                    <div style={{
                                        aspectRatio: "3 / 4",
                                        background: "#EFEDE8",
                                        borderRadius: "2px",
                                        overflow: "hidden",
                                        marginBottom: "12px",
                                    }}>
                                        {cover && (
                                            <img
                                                src={cover}
                                                alt={p.name}
                                                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                            />
                                        )}
                                    </div>
                                    <p style={{ fontSize: "14px", color: "var(--ink)", margin: "0 0 4px", fontWeight: 500 }}>
                                        {p.name}
                                    </p>
                                    {getDisplayPrice(p) !== null && (
                                        <p style={{ fontSize: "13px", color: "var(--accent)", margin: 0 }}>
                                            A partir de R${getDisplayPrice(p).toFixed(2).replace(".", ",")}
                                        </p>
                                    )}
                                </a>
                            )
                        })}
                    </div>
                )}
            </section>
        </div>
    )
}