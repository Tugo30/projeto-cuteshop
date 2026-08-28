import { useEffect, useState } from 'react'

const brl = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const csrf = () => document.querySelector('meta[name="csrf-token"]')?.content ?? ''
const api = (url, options = {}) =>
    fetch(url, {
        credentials: 'same-origin',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrf(), ...(options.headers || {}) },
        ...options,
    })

export default function CartPage() {
    const [cart, setCart] = useState(null)
    const [loading, setLoading] = useState(true)
    const [erro, setErro] = useState(null)
    const [busy, setBusy] = useState(null)
    const [cupom, setCupom] = useState('')
    const [cep, setCep] = useState('')

    const aplicar = (data) => {
        setCart(data)
        setCupom(data?.coupon_code ?? '')
        window.dispatchEvent(new CustomEvent('cart:updated', { detail: data }))
    }

    const requisitar = async (url, options, id = null) => {
        setBusy(id)
        try {
            const r = await api(url, options)
            const data = await r.json().catch(() => null)
            if (!r.ok) throw new Error(data?.message || `Erro ${r.status}`)
            aplicar(data)
            setErro(null)
        } catch (e) {
            setErro(e.message)
        } finally {
            setBusy(null)
            setLoading(false)
        }
    }

    useEffect(() => { requisitar('/api/cart') }, [])

    const mudarQtd = (item, qty) => {
        if (qty < 0 || qty > item.stock) return
        requisitar(`/api/cart/${item.id}`, { method: 'PUT', body: JSON.stringify({ quantity: qty }) }, item.id)
    }
    const remover = (item) => requisitar(`/api/cart/${item.id}`, { method: 'DELETE' }, item.id)

    if (loading) return <p className="py-20 text-center text-gray-500 font-body">Carregando sua sacola…</p>

    const items = cart?.items ?? []

    if (!items.length) return (
        <div className="py-24 px-6 text-center">
            <h1 className="font-display italic text-2xl sm:text-[28px] text-ink">Sua sacola está vazia</h1>
            {erro && <p className="text-red-700 text-sm mt-3">{erro}</p>}
            <a href="/#produtos" className="inline-block mt-7 px-8 py-3.5 bg-ink text-white font-mono text-xs tracking-wide uppercase">
                Ver produtos
            </a>
        </div>
    )

    return (
        <div className="max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
            <h1 className="font-display italic font-medium text-2xl sm:text-[30px] text-ink mb-2">Minha sacola</h1>
            <p className="font-mono text-xs text-gray-500 tracking-wide mb-8 sm:mb-10">
                {cart.count} {cart.count === 1 ? 'item' : 'itens'}
            </p>

            {erro && <p className="text-red-700 text-sm mb-5">{erro}</p>}

            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-8 lg:gap-12 items-start">
                <ul className="list-none m-0 p-0">
                    {items.map((item) => (
                        <li key={item.id}
                            className={`flex gap-4 sm:gap-5 py-5 sm:py-6 border-t border-border transition-opacity ${busy === item.id ? "opacity-50" : "opacity-100"}`}>
                            {item.image && (
                                <img src={item.image} alt={item.name} className="w-20 h-24 sm:w-24 sm:h-[120px] object-cover flex-shrink-0" />
                            )}
                            <div className="flex-1 min-w-0">
                                <p className="font-body text-sm sm:text-[15px] text-ink m-0">{item.name}</p>
                                {item.size && (
                                    <p className="font-mono text-[11px] text-gray-500 mt-1.5 tracking-wide">TAM {item.size}</p>
                                )}
                                <p className="text-[13px] text-gray-600 mt-2">{brl(item.unit_price)} un.</p>

                                <div className="flex flex-wrap items-center gap-3 sm:gap-4 mt-4">
                                    <div className="flex items-center border border-border">
                                        <button onClick={() => mudarQtd(item, item.quantity - 1)} disabled={busy === item.id}
                                            className="px-3 py-2 text-sm text-ink">−</button>
                                        <span className="w-8 text-center font-mono text-[13px]">{item.quantity}</span>
                                        <button onClick={() => mudarQtd(item, item.quantity + 1)}
                                            disabled={busy === item.id || item.quantity >= item.stock}
                                            className="px-3 py-2 text-sm text-ink">+</button>
                                    </div>
                                    <button onClick={() => remover(item)} disabled={busy === item.id}
                                        className="text-xs text-gray-500 underline">
                                        Remover
                                    </button>
                                </div>

                                {item.quantity >= item.stock && (
                                    <p className="text-[11px] text-amber-700 mt-2.5">Só temos {item.stock} em estoque</p>
                                )}
                            </div>
                            <div className="font-mono text-sm text-ink whitespace-nowrap">{brl(item.line_total)}</div>
                        </li>
                    ))}
                </ul>

                <aside className="border border-border p-5 sm:p-7">
                    <div className="flex gap-2 mb-4">
                        <input placeholder="Seu CEP" value={cep} onChange={e => setCep(e.target.value)} maxLength={9}
                            className="flex-1 border border-border px-3 py-2.5 text-[13px] min-w-0" />
                        <button onClick={() => requisitar('/api/cart/frete', { method: 'POST', body: JSON.stringify({ cep }) })}
                            disabled={busy !== null || !cep}
                            className="px-4 py-2.5 bg-ink text-white bg-black text-xs whitespace-nowrap">
                            Calcular
                        </button>
                    </div>

                    <div className="flex justify-between font-body text-sm text-ink py-1.5">
                        <span>Subtotal</span><span>{brl(cart.subtotal)}</span>
                    </div>

                    {cart.discount > 0 && (
                        <div className="flex justify-between font-body text-sm text-emerald-600 py-1.5">
                            <span>Desconto</span><span>-{brl(cart.discount)}</span>
                        </div>
                    )}

                    <div className="flex justify-between font-body text-sm text-ink py-1.5">
                        <span>Frete{cart.shipping_service ? ` (${cart.shipping_service})` : ''}</span>
                        <span>{cart.shipping === null ? 'Calcule o CEP' : cart.shipping === 0 ? 'Grátis' : brl(cart.shipping)}</span>
                    </div>

                    {cart.coupon_code ? (
                        <div className="flex justify-between items-center mb-3 text-[13px]">
                            <span>Cupom <strong>{cart.coupon_code}</strong> aplicado</span>
                            <button onClick={() => requisitar('/api/cart/cupom', { method: 'DELETE' })}
                                className="text-red-700 underline text-xs">Remover</button>
                        </div>
                    ) : (
                        <div className="flex gap-2 mb-3">
                            <input placeholder="Cupom de desconto" value={cupom} onChange={e => setCupom(e.target.value)}
                                className="flex-1 border border-border px-3 py-2.5 text-[13px] min-w-0" />
                            <button onClick={() => requisitar('/api/cart/cupom', { method: 'POST', body: JSON.stringify({ codigo: cupom }) })}
                                disabled={busy !== null || !cupom}
                                className="px-4 py-2.5 bg-ink bg-black text-white text-xs whitespace-nowrap">
                                Aplicar
                            </button>
                        </div>
                    )}

                    <div className="flex justify-between font-body text-ink border-t border-border mt-4 pt-4 text-base font-semibold">
                        <span>Total</span><span>{brl(cart.total)}</span>
                    </div>

                    <a href="/checkout"
                        className="block mt-6 py-4 text-center bg-ink text-white font-mono text-xs tracking-wide uppercase">
                        Finalizar compra
                    </a>
                </aside>
            </div>
        </div>
    )
}