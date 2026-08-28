import { useState, useEffect } from "react"
import axios from "axios"
import Navbar from "../Home/Navbar"
import WishlistButton from "@/components/WishlistButton"

export default function ProductDetail({ productId }) {
    const [product, setProduct] = useState(null)
    const [loading, setLoading] = useState(true)
    const [selectedVariant, setSelectedVariant] = useState(null)
    const [quantity, setQuantity] = useState(1)
    const [selectedImage, setSelectedImage] = useState(null)
    const [addingToCart, setAddingToCart] = useState(false)
    const [showSizeGuide, setShowSizeGuide] = useState(false)

    async function handleAddToCart() {
        if (!selectedVariant) return
        setAddingToCart(true)
        try {
            await axios.post('/api/cart', { product_variant_id: selectedVariant.id, quantity })
            alert('Produto adicionado à sacola!')
        } catch (err) {
            console.error('Erro ao adicionar ao carrinho:', err)
            alert('Não foi possível adicionar o produto. Tente novamente.')
        } finally { setAddingToCart(false) }
    }

    useEffect(() => {
        setLoading(true)
        axios.get(`/produtos/${productId}/data`)
            .then(res => {
                const data = res.data
                setProduct(data)
                const firstImage = data.images?.length ? data.images[0].url : data.image
                if (firstImage) setSelectedImage(firstImage)
                if (data.variants?.length > 0) {
                    const comEstoque = data.variants.find(v => v.stock > 0)
                    setSelectedVariant(comEstoque ?? data.variants[0])
                }
            })
            .catch(err => console.error("Erro ao carregar produto:", err))
            .finally(() => setLoading(false))
    }, [productId])

    if (loading || !product) {
        return (
            <div className="font-body bg-surface min-h-screen">
                <Navbar />
                <div className="text-center py-24 sm:py-32 text-gray-500 font-mono">
                    {loading ? "Carregando dados reais do produto..." : "Produto não encontrado."}
                </div>
            </div>
        )
    }

    const inStock = (selectedVariant?.stock ?? 0) > 0
    const maxQty = selectedVariant?.stock ?? 0
    const lowStock = inStock && maxQty <= 5
    const galleryImages = product.images?.length ? product.images.map(img => img.url) : [product.image].filter(Boolean)

    return (
        <div className="font-body bg-surface min-h-screen text-ink">
            <Navbar />
            {showSizeGuide && <SizeGuideModal onClose={() => setShowSizeGuide(false)} />}

            <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-12 py-8 sm:py-10 lg:pb-24 grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-8 lg:gap-16">
                {/* --- COLUNA ESQUERDA --- */}
                <div>
                    {/* Galeria — thumbnails vêm primeiro no DOM (coluna esquerda no desktop);
                        no mobile a ordem visual inverte com flex-col-reverse, sem depender de order-* */}
                    <div className="flex flex-col-reverse sm:flex-row gap-3 sm:gap-4 mb-8 sm:mb-12">
                        {galleryImages.length > 1 && (
                            <div className="flex flex-row sm:flex-col gap-2.5 sm:gap-3 overflow-x-auto sm:overflow-visible pb-1 sm:pb-0">
                                {galleryImages.map((img, idx) => {
                                    const active = selectedImage === img
                                    return (
                                        <button
                                            key={idx}
                                            onClick={() => setSelectedImage(img)}
                                            aria-label={`Ver imagem ${idx + 1}`}
                                            className={`w-14 h-[70px] sm:w-[60px] sm:h-[75px] flex-shrink-0 bg-[#EFEDE8] rounded-sm overflow-hidden p-0 border transition-all duration-150
                                                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/40
                                                ${active ? "border-ink opacity-100" : "border-transparent opacity-50 hover:opacity-80"}`}
                                        >
                                            <img src={img} alt="" className="w-full h-full object-cover" />
                                        </button>
                                    )
                                })}
                            </div>
                        )}

                        <div className="flex-1 aspect-[3/4] bg-[#EFEDE8] rounded-sm overflow-hidden group cursor-zoom-in">
                            {selectedImage && (
                                <img
                                    src={selectedImage}
                                    alt={product.name}
                                    className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
                                />
                            )}
                        </div>
                    </div>

                    {product.specifications?.length > 0 && (
                        <div className="border-t border-border pt-8">
                            <h3 className="font-mono text-xs uppercase tracking-wide text-gray-500 mb-4">Ficha Técnica</h3>
                            <table className="w-full text-[13px] border-collapse mb-10">
                                <tbody>
                                    {product.specifications.map(spec => (
                                        <tr key={spec.id} className="border-b border-gray-200">
                                            <td className="py-2.5 text-gray-500 w-[35%] font-mono text-xs uppercase">{spec.key}</td>
                                            <td className="py-2.5 text-ink font-medium">{spec.value}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {product.description && (
                        <div className="border-t border-border pt-8 mt-6">
                            <h3 className="font-mono text-xs uppercase tracking-wide text-gray-500 mb-4">Sobre o Produto</h3>
                            <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{product.description}</p>
                        </div>
                    )}

                    <div className="border-t border-border pt-8 mt-10">
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-6">
                            <h3 className="font-mono text-xs uppercase tracking-wide text-gray-500">Avaliações dos Clientes</h3>
                            <span className="font-mono text-[13px] text-gray-600">
                                {product.reviews_count > 0 ? `★ ${product.rating_avg} / 5.0 (${product.reviews_count} opiniões)` : "Sem avaliações ainda"}
                            </span>
                        </div>

                        {product.reviews?.length > 0 ? (
                            product.reviews.map(review => (
                                <div key={review.id} className="bg-[#FAF9F6] border border-gray-200 rounded-sm p-4 mb-3">
                                    <div className="flex flex-wrap justify-between gap-1 mb-1.5">
                                        <span className="font-semibold text-[13px]">
                                            {review.user?.name || "Cliente zLuz"} —
                                            {review.is_verified && <span className="text-green-600 font-normal"> Comprador Verificado ✓</span>}
                                        </span>
                                        <span className="text-xs text-amber-500 font-mono">
                                            {"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}
                                        </span>
                                    </div>
                                    <p className="text-[13px] text-gray-600 m-0">{review.comment}</p>
                                </div>
                            ))
                        ) : (
                            <p className="text-[13px] text-gray-400 italic">Este produto ainda não recebeu avaliações de compradores.</p>
                        )}
                    </div>
                </div>

                {/* --- COLUNA DIREITA --- */}
                <div>
                    <p className="font-mono text-xs tracking-wide text-accent uppercase mb-2">{product.category?.name}</p>

                    <div className="flex items-start justify-between gap-3 mb-3">
                        <h1 className="font-display italic font-medium text-2xl sm:text-[36px] leading-tight">{product.name}</h1>
                        <WishlistButton productId={product.id} size={22} className="mt-1.5 flex-shrink-0" />
                    </div>

                    {product.reviews_count > 0 && (
                        <div className="flex items-center gap-2 mb-5">
                            <span className="text-amber-500 text-sm">★</span>
                            <span className="text-xs text-gray-600 font-mono">{product.rating_avg} ({product.reviews_count} avaliações)</span>
                        </div>
                    )}

                    <p className="font-mono text-2xl sm:text-[28px] mb-6">
                        R$ {Number(selectedVariant?.price ?? product.price ?? 0).toFixed(2).replace(".", ",")}
                    </p>

                    {product.variants?.length > 0 && (
                        <div className="mb-6">
                            <div className="flex justify-between items-center mb-2">
                                <span className="block text-[11px] font-mono uppercase tracking-wide text-gray-500">Tamanho</span>
                                <button onClick={() => setShowSizeGuide(true)} className="text-xs text-gray-600 underline underline-offset-2 hover:text-ink transition-colors">
                                    Guia de Medidas
                                </button>
                            </div>
                            <div className="flex gap-2 flex-wrap">
                                {product.variants.map(v => {
                                    const selected = selectedVariant?.id === v.id
                                    const disabled = v.stock <= 0
                                    return (
                                        <button
                                            key={v.id}
                                            onClick={() => { setSelectedVariant(v); setQuantity(1) }}
                                            disabled={disabled}
                                            className={`min-w-[48px] px-4 py-2.5 rounded-sm text-[13px] font-mono border transition-colors
                                                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/30
                                                ${selected ? "border-ink bg-ink text-white" : "border-border bg-transparent text-ink"}
                                                ${disabled ? "text-gray-300 line-through cursor-not-allowed" : "cursor-pointer hover:border-ink"}`}
                                        >
                                            {v.size}
                                        </button>
                                    )
                                })}
                            </div>
                            {lowStock && (
                                <p className="text-xs text-amber-700 mt-2.5">Últimas {maxQty} unidades neste tamanho</p>
                            )}
                        </div>
                    )}

                    <div className="mb-5">
                        <span className="block text-[11px] font-mono uppercase tracking-wide text-gray-500 mb-2">Quantidade</span>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setQuantity(q => Math.max(1, q - 1))}
                                disabled={quantity <= 1}
                                className="w-9 h-9 border border-border rounded-sm transition-colors hover:border-ink disabled:opacity-30 disabled:hover:border-border disabled:cursor-not-allowed"
                            >−</button>
                            <span className="min-w-[24px] text-center text-sm font-mono">{quantity}</span>
                            <button
                                onClick={() => setQuantity(q => Math.min(maxQty, q + 1))}
                                disabled={quantity >= maxQty || !inStock}
                                className="w-9 h-9 border border-border rounded-sm transition-colors hover:border-ink disabled:opacity-30 disabled:hover:border-border disabled:cursor-not-allowed"
                            >+</button>
                        </div>
                    </div>

                    <button
                        disabled={!inStock || addingToCart}
                        onClick={handleAddToCart}
                        className={`w-full py-4 rounded-sm text-sm font-semibold tracking-wide uppercase mb-6 text-white transition-colors
                            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/40 focus-visible:ring-offset-2
                            ${inStock ? "bg-ink hover:bg-ink/90 cursor-pointer" : "bg-gray-300 cursor-not-allowed"}`}
                    >
                        {!inStock ? "Esgotado" : addingToCart ? "Adicionando..." : "Adicionar à Sacola"}
                    </button>

                    <div className="bg-[#F4F4F0] p-5 rounded flex flex-col gap-3.5 mb-6">
                        <SecurityItem title="Compra Garantida zLuz" desc="Receba o produto que está esperando ou devolvemos o seu dinheiro." icon="🛡️" />
                        <SecurityItem title="Devolução Grátis" desc="Você tem 30 dias a partir do recebimento para trocar sem custos." icon="🔄" />
                        <SecurityItem title="Pagamento Criptografado" desc="Processamento seguro com certificado SSL." icon="🔒" />
                    </div>
                </div>
            </div>
        </div>
    )
}

function SecurityItem({ icon, title, desc }) {
    return (
        <div className="flex gap-3 items-start">
            <span className="text-lg">{icon}</span>
            <div>
                <p className="m-0 text-[13px] font-semibold text-ink">{title}</p>
                <p className="m-0 text-xs text-gray-500 leading-snug">{desc}</p>
            </div>
        </div>
    )
}

function SizeGuideModal({ onClose }) {
    return (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-[#FAF9F6] w-full max-w-[480px] p-6 sm:p-8 rounded relative">
                <button onClick={onClose} className="absolute top-4 right-4 text-lg hover:opacity-60 transition-opacity">✕</button>
                <h3 className="font-display italic text-2xl mb-4">Tabela de Medidas (cm)</h3>
                <table className="w-full text-[13px] border-collapse text-center">
                    <thead>
                        <tr className="bg-[#EAE8E3] font-mono">
                            <th className="p-2">Tamanho</th><th className="p-2">Tórax</th><th className="p-2">Cintura</th><th className="p-2">Comprimento</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr><td className="p-2">P</td><td>92-96</td><td>76-80</td><td>70</td></tr>
                        <tr><td className="p-2">M</td><td>98-102</td><td>82-86</td><td>72</td></tr>
                        <tr><td className="p-2">G</td><td>104-108</td><td>88-92</td><td>74</td></tr>
                        <tr><td className="p-2">GG</td><td>110-114</td><td>94-98</td><td>76</td></tr>
                    </tbody>
                </table>
            </div>
        </div>
    )
}