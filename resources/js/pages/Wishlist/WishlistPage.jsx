import { useEffect, useState } from "react"
import axios from "axios"
import WishlistButton from "@/components/WishlistButton"

const brl = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

function getDisplayPrice(product) {
    if (!Array.isArray(product?.variants) || product.variants.length === 0) return product.price ?? null
    const prices = product.variants.map(v => Number(v.price)).filter(p => !isNaN(p))
    return prices.length ? Math.min(...prices) : null
}

export default function WishlistPage() {
    const [items, setItems] = useState([])
    const [loading, setLoading] = useState(true)

    const carregar = () => {
        axios.get('/wishlist')
            .then(res => setItems(res.data.items ?? []))
            .catch(() => setItems([]))
            .finally(() => setLoading(false))
    }

    useEffect(() => {
        carregar()
        // Se remover um item pelo coração aqui na própria página, recarrega a lista
        const onUpdate = () => carregar()
        window.addEventListener('wishlist:updated', onUpdate)
        return () => window.removeEventListener('wishlist:updated', onUpdate)
    }, [])

    if (loading) return <p className="py-20 text-center text-gray-500 font-body">Carregando favoritos…</p>

    if (!items.length) return (
        <div className="py-24 px-6 text-center">
            <h1 className="font-display italic text-2xl sm:text-[28px] text-ink">Sua lista de favoritos está vazia</h1>
            <a href="/#produtos" className="inline-block mt-7 px-8 py-3.5 bg-ink text-white font-mono text-xs tracking-wide uppercase">
                Ver produtos
            </a>
        </div>
    )

    return (
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-12 py-10 sm:py-14">
            <h1 className="font-display italic font-medium text-2xl sm:text-[30px] text-ink mb-2">Meus favoritos</h1>
            <p className="font-mono text-xs text-gray-500 tracking-wide mb-8 sm:mb-10">
                {items.length} {items.length === 1 ? 'item' : 'itens'}
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6 sm:gap-8">
                {items.map(p => {
                    const cover = p.images?.length ? p.images[0].url : p.image
                    const preco = getDisplayPrice(p)
                    return (
                        <div key={p.id} className="relative">
                            <div className="absolute top-2 right-2 z-10 bg-white/80 backdrop-blur-sm rounded-full">
                                <WishlistButton productId={p.id} size={16} />
                            </div>
                            <a href={`/produtos/${p.id}`} className="block text-inherit no-underline group">
                                <div className="aspect-[3/4] bg-[#EFEDE8] rounded-sm overflow-hidden mb-3">
                                    {cover && (
                                        <img src={cover} alt={p.name}
                                            className="w-full h-full object-cover transition-transform duration-400 ease-out group-hover:scale-105" />
                                    )}
                                </div>
                                <p className="text-sm text-ink mb-1 font-medium">{p.name}</p>
                                {preco !== null && (
                                    <p className="text-[13px] text-gray-600 m-0">
                                        A partir de <span className="font-semibold text-ink">{brl(preco)}</span>
                                    </p>
                                )}
                            </a>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}