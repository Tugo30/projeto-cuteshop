import { useState, useEffect, useCallback } from "react"
import axios from "axios"
import Navbar from "./Navbar"
import HomeCarousels from "@/components/HomeCarousels"

const brl = (v) =>
    Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })

const coverUrl = (p) => {
    if (p.image_url) return p.image_url
    const img = p.cover_image || p.coverImage || p.images?.[0]
    if (!img && !p.image) return null
    if (typeof img === "string") {
        return img.startsWith("http") || img.startsWith("/") ? img : `/storage/${img}`
    }
    if (img?.url) return img.url
    if (img?.path) {
        return img.path.startsWith("http") || img.path.startsWith("/")
            ? img.path
            : `/storage/${img.path}`
    }
    if (p.image) {
        return String(p.image).startsWith("http") || String(p.image).startsWith("/")
            ? p.image
            : `/storage/${p.image}`
    }
    return null
}

const categoryName = (p) =>
    typeof p.category === "object" ? p.category?.name : p.category

export default function Home() {
    const [products, setProducts] = useState([])
    const [categories, setCategories] = useState([])
    const [loading, setLoading] = useState(true)
    const [loadingMore, setLoadingMore] = useState(false)

    // filtros — vão para o backend como query string
    const params = new URLSearchParams(window.location.search)
    const [categoryId, setCategoryId] = useState(Number(params.get("categoria")) || null)
    const [isNew, setIsNew] = useState(false)
    const [page, setPage] = useState(1)
    const [lastPage, setLastPage] = useState(1)

    const [featured, setFeatured] = useState([])

    // abas: vêm do banco (id + nome). "Todos" e "Novidades" são visões, não categorias.
    useEffect(() => {
        axios
            .get("/api/categorias")
            .then((res) => setCategories(Array.isArray(res.data) ? res.data : []))
            .catch(() => setCategories([]))
    }, [])

    // destaques (primeiros 8, sem filtro)
    useEffect(() => {
        axios
            .get("/produtos/data")
            .then((res) => {
                const payload = res.data
                const items = Array.isArray(payload) ? payload : payload?.data ?? []
                setFeatured(items.slice(0, 8))
            })
            .catch(() => setFeatured([]))
    }, [])

    const loadProducts = useCallback(
        (targetPage = 1, append = false) => {
            const params = { page: targetPage }
            if (categoryId) params.categoria = categoryId
            if (isNew) params.novidades = 1

            append ? setLoadingMore(true) : setLoading(true)

            axios
                .get("/produtos/data", { params })
                .then((res) => {
                    const payload = res.data
                    const items = Array.isArray(payload) ? payload : payload?.data ?? []
                    const totalPages = Array.isArray(payload)
                        ? 1
                        : payload?.meta?.last_page ?? payload?.last_page ?? 1

                    setProducts((prev) => (append ? [...prev, ...items] : items))
                    setLastPage(totalPages)
                    setPage(targetPage)
                })
                .catch(() => {
                    if (!append) setProducts([])
                })
                .finally(() => {
                    append ? setLoadingMore(false) : setLoading(false)
                })
        },
        [categoryId, isNew]
    )

    useEffect(() => {
        loadProducts(1, false)
    }, [loadProducts])

    const handleCategory = (id) => {
        setCategoryId(id)
        setIsNew(false)
        document.getElementById("produtos")?.scrollIntoView({ behavior: "smooth", block: "start" })
    }

    const handleNew = () => {
        setCategoryId(null)
        setIsNew(true)
        document.getElementById("produtos")?.scrollIntoView({ behavior: "smooth", block: "start" })
    }

    const handleAll = () => {
        setCategoryId(null)
        setIsNew(false)
        document.getElementById("produtos")?.scrollIntoView({ behavior: "smooth", block: "start" })
    }

    const getDisplayPrice = useCallback((product) => {
        if (!product?.variants?.length) return null
        const prices = product.variants.map((v) => Number(v.price)).filter((n) => !Number.isNaN(n))
        return prices.length ? Math.min(...prices) : null
    }, [])

    const activeTab = isNew ? "novidades" : categoryId ?? "todos"

    return (
        <div className="min-h-screen bg-[#FAFAF8] text-ink">
            <Navbar />

            <section className="relative overflow-hidden border-b border-border">
                <div className="mx-auto grid max-w-[1400px] grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] items-end gap-10 px-5 sm:px-8 lg:px-12 pt-16 pb-20 lg:pt-24 lg:pb-28">
                    <div>
                        <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-[#3D5A6C] mb-5">
                            zLuz · coleção atual
                        </p>
                        <h1 className="font-display italic font-normal text-[42px] sm:text-[64px] lg:text-[80px] leading-[0.95] tracking-tight text-ink max-w-[640px]">
                            Vista sua luz.
                        </h1>
                        <p className="mt-7 max-w-[420px] text-[15px] leading-relaxed text-[#5C5A55]">
                            Peças com caimento preciso, tecido escolhido e pouco ruído. Feito para quem veste intenção.
                        </p>
                        <div className="mt-10 flex flex-wrap items-center gap-4">
                            <a
                                href="#produtos"
                                className="inline-block bg-ink text-white px-8 py-3.5 font-mono text-[11px] uppercase tracking-[0.18em]"
                            >
                                Ver a coleção
                            </a>
                            <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#8A877F]">
                                Frete grátis acima de R$ 299
                            </span>
                        </div>
                    </div>

                    <div className="hidden lg:grid grid-cols-2 gap-3 h-[420px]">
                        {featured.slice(0, 2).map((p, i) => {
                            const src = coverUrl(p)
                            return (
                                <a
                                    key={p.id}
                                    href={`/produtos/${p.id}`}
                                    className={`relative overflow-hidden bg-[#F1F1EF] ${i === 0 ? "mt-10" : "mb-10"}`}
                                >
                                    {src && (
                                        <img
                                            src={src}
                                            alt={p.name}
                                            className="h-full w-full object-cover transition-transform duration-700 hover:scale-[1.04]"
                                        />
                                    )}
                                </a>
                            )
                        })}
                    </div>
                </div>
            </section>

            {featured.length > 0 && (
                <section className="max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-12 py-16">
                    <div className="mb-8 flex items-end justify-between gap-4">
                        <div>
                            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[#8A877F] mb-1">Destaques</p>
                            <h2 className="font-display italic text-[28px] sm:text-[34px] font-normal text-ink m-0">
                                Peças da semana
                            </h2>
                        </div>
                    </div>
                    <HomeCarousels products={featured} />
                </section>
            )}

            <section id="produtos" className="border-t border-border bg-[#F6F4EE] py-16 sm:py-20 px-5 sm:px-8 lg:px-12">
                <div className="max-w-[1400px] mx-auto">
                    <div className="mb-10 flex flex-col lg:flex-row lg:items-end justify-between gap-6">
                        <div>
                            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[#8A877F] mb-1">Curadoria</p>
                            <h2 className="font-display italic text-[28px] sm:text-[34px] font-normal text-ink m-0">
                                A coleção
                            </h2>
                        </div>
                        <div className="flex gap-2 flex-wrap">
                            <button
                                onClick={handleAll}
                                className={`font-mono text-[11px] uppercase tracking-[0.12em] px-4 py-2 border transition-colors ${activeTab === "todos"
                                    ? "bg-ink text-white border-ink"
                                    : "bg-transparent text-ink border-border hover:border-ink"
                                    }`}
                            >
                                Todos
                            </button>

                            {categories.map((c) => (
                                <button
                                    key={c.id}
                                    onClick={() => handleCategory(c.id)}
                                    className={`font-mono text-[11px] uppercase tracking-[0.12em] px-4 py-2 border transition-colors ${activeTab === c.id
                                        ? "bg-ink text-white border-ink"
                                        : "bg-transparent text-ink border-border hover:border-ink"
                                        }`}
                                >
                                    {c.name}
                                </button>
                            ))}

                            <button
                                onClick={handleNew}
                                className={`font-mono text-[11px] uppercase tracking-[0.12em] px-4 py-2 border transition-colors ${activeTab === "novidades"
                                    ? "bg-ink text-white border-ink"
                                    : "bg-transparent text-ink border-border hover:border-ink"
                                    }`}
                            >
                                Novidades
                            </button>
                        </div>
                    </div>

                    {loading ? (
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-5 gap-y-10">
                            {Array.from({ length: 8 }).map((_, i) => (
                                <div key={i}>
                                    <div className="aspect-[3/4] bg-[#E8E3D5] animate-pulse" />
                                    <div className="h-3 w-3/4 bg-[#E8E3D5] mt-3 animate-pulse" />
                                </div>
                            ))}
                        </div>
                    ) : products.length === 0 ? (
                        <p className="py-20 text-center font-mono text-[12px] uppercase tracking-widest text-[#8A877F]">
                            Nenhum produto nessa categoria ainda.
                        </p>
                    ) : (
                        <>
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-5 gap-y-10">
                                {products.map((p) => {
                                    const cover = coverUrl(p)
                                    const minPrice = getDisplayPrice(p)
                                    const catName = categoryName(p)

                                    return (
                                        <a key={p.id} href={`/produtos/${p.id}`} className="group block text-ink no-underline">
                                            <div className="relative aspect-[3/4] overflow-hidden bg-[#EDEAE2] mb-3">
                                                {cover ? (
                                                    <img
                                                        src={cover}
                                                        alt={p.name}
                                                        loading="lazy"
                                                        decoding="async"
                                                        className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.05]"
                                                    />
                                                ) : (
                                                    <div className="h-full w-full flex items-center justify-center font-mono text-[10px] uppercase tracking-widest text-[#8A877F]">
                                                        Em breve
                                                    </div>
                                                )}
                                                {catName && (
                                                    <span className="absolute left-3 bottom-3 font-mono text-[10px] uppercase tracking-[0.14em] bg-white/90 px-2 py-1">
                                                        {catName}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="m-0 text-[14px] font-medium tracking-tight">{p.name}</p>
                                            {minPrice !== null && (
                                                <p className="m-0 mt-1 font-mono text-[12px] text-[#5C5A55]">
                                                    {brl(minPrice)}
                                                </p>
                                            )}
                                        </a>
                                    )
                                })}
                            </div>

                            {page < lastPage && (
                                <div className="text-center mt-14">
                                    <button
                                        onClick={() => loadProducts(page + 1, true)}
                                        disabled={loadingMore}
                                        className="border border-ink px-10 py-3 font-mono text-[11px] uppercase tracking-[0.16em] text-ink hover:bg-ink hover:text-white transition-colors disabled:opacity-40"
                                    >
                                        {loadingMore ? "Carregando…" : "Ver mais"}
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </section>
        </div>
    )
}
