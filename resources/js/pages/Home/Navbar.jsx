import { useState, useEffect } from "react"
import axios from "axios"
import { Toaster } from "sonner"

export default function Navbar() {
    const [scrolled, setScrolled] = useState(false)
    const [navOpen, setNavOpen] = useState(false)
    const [menuOpen, setMenuOpen] = useState(false)
    const [user, setUser] = useState(null)
    const [cartCount, setCartCount] = useState(0)
    const [wishlistCount, setWishlistCount] = useState(0)

    const [searchOpen, setSearchOpen] = useState(false)
    const [searchTerm, setSearchTerm] = useState("")
    const [searchResults, setSearchResults] = useState([])
    const [searching, setSearching] = useState(false)

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 8)
        window.addEventListener("scroll", onScroll)
        return () => window.removeEventListener("scroll", onScroll)
    }, [])

    useEffect(() => {
        axios.get('/api/me', { withCredentials: true })
            .then(res => setUser(res.data))
            .catch(() => setUser(null))
    }, [])

    useEffect(() => {
        const ler = (data) => setCartCount(Number(data?.count ?? 0))
        fetch('/api/cart', { credentials: 'same-origin', headers: { Accept: 'application/json' } })
            .then(r => r.json()).then(ler).catch(() => { })
        const onUpdate = (e) => ler(e.detail)
        window.addEventListener('cart:updated', onUpdate)
        return () => window.removeEventListener('cart:updated', onUpdate)
    }, [])

    useEffect(() => {
        const ler = (data) => setWishlistCount(Number(data?.count ?? 0))
        axios.get('/wishlist').then(res => ler(res.data)).catch(() => { })
        const onUpdate = (e) => ler(e.detail)
        window.addEventListener('wishlist:updated', onUpdate)
        return () => window.removeEventListener('wishlist:updated', onUpdate)
    }, [])

    useEffect(() => {
        if (!searchTerm.trim()) {
            setSearchResults([])
            return
        }
        setSearching(true)
        const timer = setTimeout(() => {
            axios.get('/produtos/busca', { params: { q: searchTerm } })
                .then(res => setSearchResults(res.data))
                .catch(() => setSearchResults([]))
                .finally(() => setSearching(false))
        }, 400)
        return () => clearTimeout(timer)
    }, [searchTerm])

    return (
        <>
            <Toaster position="top-center" richColors />
            <div className="w-full bg-ink text-white text-center py-2 px-4 font-mono text-[11px] sm:text-xs tracking-wide">
                Frete grátis acima de R$ 299 · Pagamento 100% seguro
            </div>

            <header className={`sticky top-0 z-50 w-full transition-all duration-200 ${scrolled ? "bg-surface/85 backdrop-blur-sm border-b border-border" : "bg-surface border-b border-transparent"
                }`}>
                <nav className="flex items-center justify-between px-4 sm:px-6 lg:px-12 py-4 max-w-[1400px] mx-auto">
                    <a href="/" className="font-display italic font-medium text-xl text-ink tracking-tight">
                        zLuz
                    </a>

                    <div className="flex items-center gap-3 sm:gap-5">
                        <button aria-label="Buscar" className="text-ink p-1" onClick={() => setSearchOpen(true)}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                                <circle cx="11" cy="11" r="7" />
                                <line x1="21" y1="21" x2="16.65" y2="16.65" />
                            </svg>
                        </button>

                        <a href="/favoritos" aria-label="Favoritos" className="relative text-ink p-1">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                                <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8Z" />
                            </svg>
                            {wishlistCount > 0 && (
                                <span className="absolute -top-1 -right-1 bg-primary text-white font-mono text-[10px] w-4 h-4 rounded-full flex items-center justify-center">
                                    {wishlistCount}
                                </span>
                            )}
                        </a>

                        {user ? (
                            <div className="relative">
                                <button aria-label="Minha conta" className="text-ink p-1" onClick={() => setMenuOpen(!menuOpen)}>
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                        <circle cx="12" cy="7" r="4" />
                                    </svg>
                                </button>
                                {menuOpen && (
                                    <div className="absolute top-9 right-0 bg-surface border border-border rounded shadow-lg min-w-[180px] z-[60]">
                                        <div className="px-4 py-3 border-b border-border/60 text-xs text-gray-500">
                                            Olá, {user.username}
                                        </div>
                                        <a href="/profile" className="block px-4 py-2.5 text-sm text-ink">Meu Perfil</a>
                                        <a href="/meus-pedidos" className="block px-4 py-2.5 text-sm text-ink">Meus pedidos</a>
                                        <form method="POST" action="/logout">
                                            <input type="hidden" name="_token" value={document.querySelector('meta[name="csrf-token"]')?.content} />
                                            <button type="submit" className="block w-full text-left px-4 py-2.5 text-sm text-red-700 bg-transparent border-0 cursor-pointer">Sair da conta</button>
                                        </form>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <a href="/login" className="text-ink text-[13px] font-semibold hidden sm:inline">
                                Entrar / Registrar-se
                            </a>
                        )}

                        {(user?.role_id === 1) && (
                            <a href="/admin/dashboard" className="hidden sm:inline font-mono text-[11px] uppercase tracking-[0.14em] border border-border px-3 py-1.5 text-ink">
                                Painel
                            </a>
                        )}

                        <a href="/carrinho" aria-label="Sacola" className="relative text-ink p-1">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                                <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
                                <path d="M3 6h18" />
                                <path d="M16 10a4 4 0 0 1-8 0" />
                            </svg>
                            {cartCount > 0 && (
                                <span className="absolute -top-1 -right-1 bg-primary text-white font-mono text-[10px] w-4 h-4 rounded-full flex items-center justify-center">
                                    {cartCount}
                                </span>
                            )}
                        </a>

                        <button aria-label="Menu" className="md:hidden text-ink p-1" onClick={() => setNavOpen(!navOpen)}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                                {navOpen
                                    ? <path d="M18 6 6 18M6 6l12 12" />
                                    : <path d="M3 6h18M3 12h18M3 18h18" />}
                            </svg>
                        </button>
                    </div>
                </nav>

                {navOpen && (
                    <div className="md:hidden border-t border-border bg-surface px-4 py-4 flex flex-col gap-3 font-body text-sm text-ink">
                        <a href="/favoritos" onClick={() => setNavOpen(false)}>Favoritos {wishlistCount > 0 && `(${wishlistCount})`}</a>
                        {!user && <a href="/login" className="font-semibold" onClick={() => setNavOpen(false)}>Entrar / Registrar-se</a>}
                    </div>
                )}
            </header>

            {searchOpen && (
                <div
                    onClick={() => setSearchOpen(false)}
                    className="fixed inset-0 bg-black/40 z-[100] flex justify-center pt-20 px-4"
                >
                    <div
                        onClick={e => e.stopPropagation()}
                        className="bg-surface w-full sm:w-[600px] max-h-[70vh] rounded p-5 overflow-y-auto"
                    >
                        <input
                            autoFocus
                            placeholder="Buscar produtos..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full px-3.5 py-3 text-[15px] border border-border rounded-sm outline-none box-border mb-4"
                        />
                        {searching && <p className="text-[13px] text-gray-500">Buscando...</p>}
                        {!searching && searchTerm && searchResults.length === 0 && (
                            <p className="text-[13px] text-gray-500">Nenhum produto encontrado.</p>
                        )}
                        {searchResults.map(product => (
                            <a
                                key={product.id}
                                href={`/produtos/${product.id}`}
                                className="flex gap-3 py-2.5 border-t border-gray-100 text-ink"
                            >
                                {product.images?.[0]?.url && (
                                    <img src={product.images[0].url} className="w-12 h-[60px] object-cover" alt={product.name} />
                                )}
                                <div>
                                    <p className="text-sm m-0">{product.name}</p>
                                    <p className="text-xs text-gray-500 mt-1 mb-0">{product.category?.name}</p>
                                </div>
                            </a>
                        ))}
                    </div>
                </div>
            )}
        </>
    )
}
