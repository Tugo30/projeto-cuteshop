import { useState, useEffect } from "react"
import { toast } from "sonner"
import axios from "axios"
import Navbar from "../Home/Navbar"
import WishlistButton from "@/components/WishlistButton"
import ReviewForm from "@/components/ReviewForm"
import ImageLightbox from "@/components/ImageLightbox"

const brl = (v) => Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })

function Stars({ value = 0, size = 13 }) {
    const n = Math.round(Number(value) || 0)
    return (
        <span className="inline-flex gap-[2px]" aria-label={`${n} de 5`}>
            {[1, 2, 3, 4, 5].map((i) => (
                <svg key={i} width={size} height={size} viewBox="0 0 24 24" fill={i <= n ? "#111" : "none"} stroke="#111" strokeWidth="1.4">
                    <path d="M12 3.6 14.5 9l6 .5-4.6 4 1.4 5.9L12 16.8 6.7 19.4 8.1 13.5 3.5 9.5l6-.5L12 3.6Z" />
                </svg>
            ))}
        </span>
    )
}

function Accordion({ id, title, children, open, onToggle }) {
    return (
        <div className="border-b border-neutral-200">
            <button type="button" onClick={() => onToggle(id)} className="flex w-full items-center justify-between py-5 text-left">
                <span className="text-[11px] font-medium uppercase tracking-[0.18em]">{title}</span>
                <span className="text-lg font-light leading-none">{open ? "−" : "+"}</span>
            </button>
            {open && <div className="pb-6">{children}</div>}
        </div>
    )
}

export default function ProductDetail({ productId }) {
    const [product, setProduct] = useState(null)
    const [loading, setLoading] = useState(true)
    const [selectedVariant, setSelectedVariant] = useState(null)
    const [quantity, setQuantity] = useState(1)
    const [addingToCart, setAddingToCart] = useState(false)
    const [activeAccordion, setActiveAccordion] = useState("desc")
    const [selectedImage, setSelectedImage] = useState(0)
    const [lightboxOpen, setLightboxOpen] = useState(false)
    const [cep, setCep] = useState("")
    const [shippingResult, setShippingResult] = useState(null)
    const [calculatingShipping, setCalculatingShipping] = useState(false)
    const [shippingError, setShippingError] = useState("")

    useEffect(() => {
        const urlParts = window.location.pathname.split("/").filter(Boolean)
        const currentId = productId || urlParts[urlParts.length - 1]

        if (!currentId || currentId === "null" || currentId === "undefined") {
            setLoading(false)
            return
        }

        setLoading(true)
        axios
            .get(`/produtos/${currentId}/data`)
            .then((res) => {
                setProduct(res.data)
                if (res.data.variants?.length > 0) {
                    const availableVariant = res.data.variants.find((v) => v.stock > 0)
                    setSelectedVariant(availableVariant ?? res.data.variants[0])
                }
            })
            .catch(() => setProduct(null))
            .finally(() => setLoading(false))
    }, [productId])

    if (loading || !product) {
        return (
            <div className="min-h-screen bg-[#FAFAF8]">
                <Navbar />
                <div className="flex min-h-[70vh] items-center justify-center">
                    <span className="text-[11px] uppercase tracking-[0.25em] text-neutral-400">
                        {loading ? "Carregando produto..." : "Produto indisponível."}
                    </span>
                </div>
            </div>
        )
    }

    const inStock = (selectedVariant?.stock ?? 0) > 0
    const maxQty = selectedVariant?.stock ?? 0
    const galleryImages = product.images?.length
        ? product.images.map((img) => img.url)
        : [product.image_url ?? (product.image ? `/storage/${product.image}` : null)].filter(Boolean)
    const currentPrice = Number(selectedVariant?.price ?? product.price ?? 0)
    const reviewCount = product.reviews?.length ?? 0
    const ratingAvg = Number(product.rating_avg || 0)
    const specs = product.specifications ?? []

    const toggleAccordion = (id) => setActiveAccordion(activeAccordion === id ? null : id)

    const handleAddToCart = async () => {
        if (!selectedVariant || !inStock) return
        setAddingToCart(true)
        try {
            const { data } = await axios.post("/api/cart", {
                product_variant_id: selectedVariant.id,
                quantity,
            })
            window.dispatchEvent(new CustomEvent("cart:updated", { detail: data }))
            toast.success("Produto adicionado à sacola.")
        } catch (err) {
            toast.error(err.response?.data?.message ?? "Não foi possível adicionar à sacola.")
        } finally {
            setAddingToCart(false)
        }
    }

    const handleCep = (value) => {
        const digits = value.replace(/\D/g, "").slice(0, 8)
        setCep(digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits)
    }

    const handleCalculateShipping = async () => {
        const cleanCep = cep.replace(/\D/g, "")
        if (cleanCep.length !== 8) {
            setShippingError("Informe um CEP válido com 8 dígitos.")
            return
        }
        setCalculatingShipping(true)
        setShippingError("")
        setShippingResult(null)
        try {
            const response = await axios.post("/api/frete/calcular", {
                cep: cleanCep,
                product_id: product.id,
                quantity,
            })
            setShippingResult(response.data)
        } catch {
            setShippingError("Não foi possível calcular o frete. Tente novamente.")
        } finally {
            setCalculatingShipping(false)
        }
    }

    const reloadProduct = () =>
        axios.get(`/produtos/${product.id}/data`).then((res) => setProduct(res.data))



    return (
        <div className="min-h-screen bg-[#FAFAF8] text-neutral-900">
            <Navbar />

            <main className="mx-auto max-w-[1500px] px-5 pb-24 pt-6 sm:px-8 lg:px-12">
                <nav className="mb-8 flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-neutral-400">
                    <a href="/" className="hover:text-neutral-700">Início</a>
                    <span>/</span>
                    <span>{product.category?.name ?? "Produtos"}</span>
                    <span>/</span>
                    <span className="text-neutral-700">{product.name}</span>
                </nav>

                <div className="grid grid-cols-1 gap-12 lg:grid-cols-[minmax(0,1.7fr)_minmax(380px,0.8fr)] lg:gap-20">
                    <section className="flex min-w-0 gap-4">
                        {galleryImages.length > 1 && (
                            <div className="hidden w-[82px] flex-shrink-0 flex-col gap-3 md:flex">
                                {galleryImages.map((imgUrl, index) => (
                                    <button
                                        key={index}
                                        type="button"
                                        onClick={() => setSelectedImage(index)}
                                        className={`relative aspect-[4/5] w-full overflow-hidden bg-[#F1F1EF] ${selectedImage === index ? "ring-1 ring-neutral-900" : "opacity-50 hover:opacity-100"}`}
                                    >
                                        <img src={imgUrl} alt={`${product.name} ${index + 1}`} className="h-full w-full object-cover" />
                                    </button>
                                ))}
                            </div>
                        )}

                        <div className="relative min-w-0 flex-1">
                            <div className="relative aspect-[4/5] w-full overflow-hidden bg-[#F1F1EF]">
                                {galleryImages[selectedImage] ? (
                                    <button type="button" onClick={() => setLightboxOpen(true)} className="h-full w-full cursor-zoom-in border-0 bg-transparent p-0">
                                        <img src={galleryImages[selectedImage]} alt={product.name} className="h-full w-full object-cover object-center" />
                                    </button>
                                ) : (
                                    <div className="flex h-full items-center justify-center text-[10px] uppercase tracking-widest text-neutral-400">Sem imagem</div>
                                )}
                                {!inStock && (
                                    <div className="absolute left-5 top-5 pointer-events-none">
                                        <span className="bg-white px-4 py-2 text-[10px] uppercase tracking-[0.2em] text-neutral-700">Esgotado</span>
                                    </div>
                                )}
                            </div>

                            {galleryImages.length > 1 && (
                                <div className="mt-3 flex gap-2 overflow-x-auto md:hidden">
                                    {galleryImages.map((imgUrl, index) => (
                                        <button
                                            key={index}
                                            type="button"
                                            onClick={() => setSelectedImage(index)}
                                            className={`h-20 w-16 flex-shrink-0 overflow-hidden ${selectedImage === index ? "ring-1 ring-neutral-900" : "opacity-50"}`}
                                        >
                                            <img src={imgUrl} alt="" className="h-full w-full object-cover" />
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </section>

                    <aside className="lg:sticky lg:top-8 lg:self-start">
                        <div className="border-b border-neutral-200 pb-7">
                            <div className="flex items-start justify-between gap-6">
                                <div>
                                    <h1 className="max-w-[520px] text-[25px] font-normal leading-[1.15] tracking-[-0.02em] sm:text-[28px]">
                                        {product.name}
                                    </h1>
                                    <p className="mt-3 text-[10px] uppercase tracking-[0.2em] text-neutral-400">
                                        {product.sku ? `REF. ${product.sku}` : `REF. ${product.id}`}
                                    </p>
                                    {reviewCount > 0 && (
                                        <a href="#avaliacoes" className="mt-3 flex items-center gap-2 text-neutral-600 no-underline">
                                            <Stars value={ratingAvg} />
                                            <span className="text-[11px]">{ratingAvg.toFixed(1)} · {reviewCount} {reviewCount === 1 ? "avaliação" : "avaliações"}</span>
                                        </a>
                                    )}
                                </div>
                                <WishlistButton productId={product.id} size={20} className="flex-shrink-0 text-neutral-700 hover:text-black" />
                            </div>

                            <div className="mt-7">
                                <div className="text-[24px] font-medium tracking-tight">{brl(currentPrice)}</div>
                                <p className="mt-1 text-[11px] text-neutral-400">Em até 4x sem juros</p>
                            </div>
                        </div>

                        {product.variants?.length > 0 && (
                            <div className="border-b border-neutral-200 py-7">
                                <div className="mb-4 flex items-center justify-between">
                                    <span className="text-[11px] font-medium uppercase tracking-[0.18em]">Tamanho</span>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {product.variants.map((variant) => {
                                        const selected = selectedVariant?.id === variant.id
                                        const disabled = variant.stock <= 0
                                        return (
                                            <button
                                                key={variant.id}
                                                type="button"
                                                disabled={disabled}
                                                onClick={() => { setSelectedVariant(variant); setQuantity(1) }}
                                                className={`flex h-12 min-w-[58px] items-center justify-center border px-4 text-[11px] uppercase tracking-[0.1em] ${selected ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-300 hover:border-neutral-900"} ${disabled ? "cursor-not-allowed opacity-30 line-through" : ""}`}
                                            >
                                                {variant.size || variant.name}
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>
                        )}

                        <div className="border-b border-neutral-200 py-7">
                            <div className="flex gap-3">
                                <div className="flex h-14 border border-neutral-300">
                                    <button type="button" onClick={() => setQuantity((q) => Math.max(1, q - 1))} disabled={quantity <= 1} className="flex w-11 items-center justify-center text-neutral-500 hover:text-black disabled:opacity-20">−</button>
                                    <span className="flex w-10 items-center justify-center text-[11px]">{quantity}</span>
                                    <button type="button" onClick={() => setQuantity((q) => Math.min(maxQty, q + 1))} disabled={quantity >= maxQty || !inStock} className="flex w-11 items-center justify-center text-neutral-500 hover:text-black disabled:opacity-20">+</button>
                                </div>
                                <button
                                    type="button"
                                    disabled={!inStock || addingToCart}
                                    onClick={handleAddToCart}
                                    className={`h-14 flex-1 text-[11px] font-medium uppercase tracking-[0.18em] ${inStock ? "bg-neutral-900 text-white hover:bg-neutral-800" : "cursor-not-allowed bg-neutral-200 text-neutral-400"}`}
                                >
                                    {!inStock ? "Produto esgotado" : addingToCart ? "Adicionando..." : "Adicionar à sacola"}
                                </button>
                            </div>
                        </div>

                        <Accordion id="frete" title="Envio & Entrega" open={activeAccordion === "frete"} onToggle={toggleAccordion}>

                            <p className="mb-4 text-xs leading-relaxed text-neutral-500">Informe seu CEP para consultar prazo e valor de entrega.</p>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={cep}
                                    onChange={(e) => handleCep(e.target.value)}
                                    placeholder="00000-000"
                                    maxLength={9}
                                    className="h-11 flex-1 border border-neutral-300 bg-transparent px-4 text-xs outline-none placeholder:text-neutral-400 focus:border-neutral-900"
                                />
                                <button type="button" onClick={handleCalculateShipping} disabled={calculatingShipping} className="h-11 bg-neutral-900 px-6 text-[10px] uppercase tracking-[0.15em] text-white hover:bg-neutral-800 disabled:opacity-50">
                                    {calculatingShipping ? "Calculando..." : "Calcular"}
                                </button>
                            </div>
                            {shippingError && <p className="mt-2 text-xs text-red-500">{shippingError}</p>}
                            {shippingResult && (
                                <div className="mt-4 flex flex-col gap-2 rounded border border-neutral-200 bg-neutral-50 p-3 text-xs">
                                    {(Array.isArray(shippingResult) ? shippingResult : [shippingResult]).map((option, index) => (
                                        <div key={index} className="flex items-center justify-between border-b border-neutral-200 py-2 last:border-0">
                                            <div>
                                                <span className="font-medium text-neutral-800">{option.name || option.servico || "Entrega"}</span>
                                                <p className="text-[10px] text-neutral-500">Prazo: {option.delivery_time ?? option.deadline ?? option.prazo ?? "N/A"} dias úteis</p>
                                            </div>
                                            <span className="font-semibold">{brl(option.price ?? option.valor ?? 0)}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </Accordion>

                        {product.description && (
                            <Accordion id="desc" title="Descrição" open={activeAccordion === "desc"} onToggle={toggleAccordion}>
                                <p className="m-0 whitespace-pre-line text-xs leading-relaxed text-neutral-600">{product.description}</p>
                            </Accordion>
                        )}

                        {specs.length > 0 && (
                            <Accordion id="specs" title="Especificações" open={activeAccordion === "specs"} onToggle={toggleAccordion}>
                                <dl className="m-0">
                                    {specs.map((s, i) => (
                                        <div key={i} className="flex justify-between gap-4 border-b border-neutral-100 py-2 text-xs last:border-0">
                                            <dt className="text-neutral-500">{s.label}</dt>
                                            <dd className="m-0 text-neutral-800">{s.value}</dd>
                                        </div>
                                    ))}
                                </dl>
                            </Accordion>
                        )}
                    </aside>
                </div>

                <section id="avaliacoes" className="mt-24 scroll-mt-28 border-t border-neutral-200 pt-16">
                    <ReviewForm
                        productId={product.id}
                        reviews={product.reviews}
                        ratingAvg={product.rating_avg}
                        onSubmitted={reloadProduct}
                    />
                </section>

                {product.related_products?.length > 0 && (
                    <section className="mt-24 border-t border-neutral-200 pt-16">
                        <div className="mb-10 text-center">
                            <h2 className="text-lg font-normal uppercase tracking-[0.2em]">Quem viu este, também viu</h2>
                            <p className="mt-2 text-xs text-neutral-400">Sugestões selecionadas para você</p>
                        </div>
                        <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4">
                            {product.related_products.map((item) => (
                                <a key={item.id} href={`/produtos/${item.id}`} className="group flex flex-col no-underline">
                                    <div className="aspect-[4/5] w-full overflow-hidden bg-[#F1F1EF]">
                                        {item.image_url ? (
                                            <img src={item.image_url} alt={item.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                                        ) : (
                                            <div className="flex h-full items-center justify-center text-[10px] uppercase tracking-wider text-neutral-400">Sem imagem</div>
                                        )}
                                    </div>
                                    <div className="mt-4 text-center">
                                        <h3 className="m-0 text-xs font-normal text-neutral-800 group-hover:text-neutral-500">{item.name}</h3>
                                        <span className="mt-1 block text-xs font-medium">{brl(item.price)}</span>
                                    </div>
                                </a>
                            ))}
                        </div>
                    </section>
                )}
                {lightboxOpen && galleryImages.length > 0 && (
                    <ImageLightbox
                        images={galleryImages}
                        index={selectedImage}
                        onIndex={setSelectedImage}
                        onClose={() => setLightboxOpen(false)}
                        caption={product.name}
                    />
                )}
            </main>
        </div>
    )
}
