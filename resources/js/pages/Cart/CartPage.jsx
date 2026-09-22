import { useEffect, useState } from 'react'
import { toast } from 'sonner'

const brl = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const csrf = () => document.querySelector('meta[name="csrf-token"]')?.content ?? ''
const api = (url, options = {}) =>
    fetch(url, {
        credentials: 'same-origin',
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            'X-CSRF-TOKEN': csrf(),
            ...(options.headers || {}),
        },
        ...options,
    })

const itemImage = (item) => {
    const raw = item.image_url || item.image || item.image_path
    if (!raw) return null
    if (raw.startsWith('http') || raw.startsWith('/')) return raw
    return `/storage/${raw}`
}

const maskCep = (v) => {
    const d = v.replace(/\D/g, '').slice(0, 8)
    return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d
}

export default function CartPage() {
    const [cart, setCart] = useState(null)
    const [loading, setLoading] = useState(true)
    const [erro, setErro] = useState(null)
    const [busy, setBusy] = useState(null)
    const [cupom, setCupom] = useState('')
    const [cep, setCep] = useState('')
    const [shippingOptions, setShippingOptions] = useState([])
    const [shippingBusy, setShippingBusy] = useState(false)

    const aplicar = (data) => {
        setCart(data)
        setCupom(data?.coupon_code ?? '')
        if (data?.shipping_cep) setCep(maskCep(data.shipping_cep))
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
            return data
        } catch (e) {
            setErro(e.message)
            toast.error(e.message)
            return null
        } finally {
            setBusy(null)
            setLoading(false)
        }
    }

    useEffect(() => {
        requisitar('/api/cart')
    }, [])

    const mudarQtd = (item, qty) => {
        if (qty < 0 || qty > item.stock) return
        requisitar(`/api/cart/${item.id}`, { method: 'PUT', body: JSON.stringify({ quantity: qty }) }, item.id)
    }

    const remover = (item) => requisitar(`/api/cart/${item.id}`, { method: 'DELETE' }, item.id)

    const calcularFrete = async () => {
        const cleanCep = cep.replace(/\D/g, '')
        if (cleanCep.length !== 8) {
            toast.error('Informe um CEP válido com 8 dígitos.')
            return
        }
        setShippingBusy(true)
        setErro(null)
        try {
            const r = await api('/api/cart/frete', { method: 'POST', body: JSON.stringify({ cep: cleanCep }) })
            const data = await r.json().catch(() => null)
            if (!r.ok) throw new Error(data?.message || 'Não foi possível calcular o frete.')
            const options = Array.isArray(data?.options) ? data.options : []
            setShippingOptions(options)
            if (!options.length) toast.error('Nenhum serviço de entrega para este CEP.')
        } catch (e) {
            setShippingOptions([])
            setErro(e.message)
            toast.error(e.message)
        } finally {
            setShippingBusy(false)
        }
    }

    const selecionarFrete = async (option) => {
        setShippingBusy(true)
        try {
            const r = await api('/api/cart/frete/selecionar', {
                method: 'POST',
                body: JSON.stringify({ cep: cep.replace(/\D/g, ''), service: String(option.id ?? option.name) }),
            })
            const data = await r.json().catch(() => null)
            if (!r.ok) throw new Error(data?.message || 'Não foi possível aplicar o frete.')
            aplicar(data)
            toast.success(`Frete ${option.name} aplicado.`)
        } catch (e) {
            toast.error(e.message)
        } finally {
            setShippingBusy(false)
        }
    }

    if (loading) {
        return (
            <div className="max-w-[1180px] mx-auto px-4 sm:px-8 py-16">
                <div className="h-8 w-48 bg-[#EDEAE2] animate-pulse mb-10" />
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-12">
                    <div className="space-y-6">
                        {[1, 2].map((i) => (
                            <div key={i} className="flex gap-5 border-t border-border pt-6">
                                <div className="w-24 h-[120px] bg-[#EDEAE2] animate-pulse" />
                                <div className="flex-1 space-y-3">
                                    <div className="h-4 w-2/3 bg-[#EDEAE2] animate-pulse" />
                                    <div className="h-3 w-24 bg-[#EDEAE2] animate-pulse" />
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="h-80 bg-[#EDEAE2] animate-pulse" />
                </div>
            </div>
        )
    }

    const items = cart?.items ?? []
    const count = items.reduce((s, i) => s + Number(i.quantity || 0), 0)
    const hasShipping = Boolean(cart?.shipping_service && cart?.shipping_cents != null)
    const shippingIsFree = hasShipping && Number(cart.shipping_cents) === 0
    const total = (Number(cart?.subtotal_cents || 0) - Number(cart?.discount_cents || 0) + (hasShipping ? Number(cart.shipping_cents) : 0)) / 100

    if (!items.length) {
        return (
            <div className="py-28 px-6 text-center">
                <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[#8A877F] mb-3">Sacola</p>
                <h1 className="font-display italic text-[32px] sm:text-[40px] text-ink m-0">Sua sacola está vazia</h1>
                <p className="mt-4 text-sm text-[#5C5A55]">As peças que você escolher aparecem aqui.</p>
                <a href="/#produtos" className="inline-block mt-8 px-8 py-3.5 bg-ink text-white font-mono text-[11px] tracking-[0.16em] uppercase">
                    Ver a coleção
                </a>
            </div>
        )
    }

    return (
        <div className="max-w-[1180px] mx-auto px-4 sm:px-8 py-10 sm:py-16">
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[#8A877F] mb-2">Sacola</p>
            <h1 className="font-display italic font-normal text-[32px] sm:text-[40px] text-ink m-0">Minha sacola</h1>
            <p className="font-mono text-[11px] text-[#8A877F] tracking-wide mt-2 mb-10">
                {count} {count === 1 ? 'peça' : 'peças'}
            </p>

            {erro && <p className="text-red-700 text-sm mb-6 bg-red-50 px-4 py-3">{erro}</p>}

            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px] gap-10 lg:gap-16 items-start">
                <ul className="list-none m-0 p-0">
                    {items.map((item) => {
                        const img = itemImage(item)
                        return (
                            <li
                                key={item.id}
                                className={`flex gap-4 sm:gap-6 py-6 border-t border-border ${busy === item.id ? 'opacity-50' : ''}`}
                            >
                                <a href={`/produtos/${item.product_id ?? ''}`} className="w-24 h-[120px] sm:w-28 sm:h-[140px] flex-shrink-0 bg-[#F1F1EF] overflow-hidden block">
                                    {img ? (
                                        <img src={img} alt={item.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="w-full h-full flex items-center justify-center font-mono text-[10px] uppercase tracking-widest text-[#8A877F]">
                                            Sem foto
                                        </span>
                                    )}
                                </a>

                                <div className="flex-1 min-w-0 flex flex-col">
                                    <div className="flex justify-between gap-4">
                                        <div className="min-w-0">
                                            <p className="m-0 text-[15px] text-ink tracking-tight">{item.name}</p>
                                            {item.size && (
                                                <p className="m-0 mt-1.5 font-mono text-[11px] text-[#8A877F] tracking-[0.12em]">TAM {item.size}</p>
                                            )}
                                        </div>
                                        <p className="m-0 font-mono text-sm text-ink whitespace-nowrap">{brl(item.line_total)}</p>
                                    </div>

                                    <p className="m-0 mt-2 text-[13px] text-[#5C5A55]">{brl(item.unit_price)} un.</p>

                                    <div className="mt-auto pt-4 flex flex-wrap items-center gap-4">
                                        <div className="flex items-center border border-border h-10">
                                            <button type="button" onClick={() => mudarQtd(item, item.quantity - 1)} disabled={busy === item.id} className="w-10 h-full text-ink">−</button>
                                            <span className="w-8 text-center font-mono text-[13px]">{item.quantity}</span>
                                            <button type="button" onClick={() => mudarQtd(item, item.quantity + 1)} disabled={busy === item.id || item.quantity >= item.stock} className="w-10 h-full text-ink">+</button>
                                        </div>
                                        <button type="button" onClick={() => remover(item)} disabled={busy === item.id} className="font-mono text-[11px] uppercase tracking-widest text-[#8A877F] underline underline-offset-4">
                                            Remover
                                        </button>
                                    </div>

                                    {item.quantity >= item.stock && (
                                        <p className="m-0 mt-2 text-[11px] text-amber-800">Só temos {item.stock} em estoque</p>
                                    )}
                                </div>
                            </li>
                        )
                    })}
                </ul>

                <aside className="border border-border bg-white p-6 sm:p-8 lg:sticky lg:top-24">
                    <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#8A877F] mb-5">Resumo</p>

                    <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#8A877F] mb-2">CEP</p>
                    <div className="flex gap-2 mb-4">
                        <input
                            placeholder="00000-000"
                            value={cep}
                            onChange={(e) => setCep(maskCep(e.target.value))}
                            maxLength={9}
                            className="flex-1 border border-border px-3 py-2.5 text-[13px] min-w-0 bg-transparent outline-none focus:border-ink"
                        />
                        <button
                            type="button"
                            onClick={calcularFrete}
                            disabled={shippingBusy || cep.replace(/\D/g, '').length !== 8}
                            className="px-4 py-2.5 bg-ink text-white font-mono text-[11px] uppercase tracking-widest disabled:opacity-40"
                        >
                            {shippingBusy ? '...' : 'OK'}
                        </button>
                    </div>

                    {shippingOptions.length > 0 && (
                        <ul className="list-none m-0 p-0 mb-5 border border-border">
                            {shippingOptions.map((opt) => {
                                const selected = String(cart?.shipping_service) === String(opt.name)
                                return (
                                    <li key={opt.id ?? opt.name}>
                                        <button
                                            type="button"
                                            onClick={() => selecionarFrete(opt)}
                                            disabled={shippingBusy}
                                            className={`w-full text-left px-3 py-3 border-b border-border last:border-0 ${selected ? 'bg-[#F6F4EE]' : 'bg-transparent'}`}
                                        >
                                            <div className="flex justify-between gap-3 text-[13px]">
                                                <span>{opt.name}</span>
                                                <span className="font-mono">{opt.price_cents === 0 ? 'Grátis' : brl(opt.price)}</span>
                                            </div>
                                            {opt.delivery_time != null && (
                                                <p className="m-0 mt-1 font-mono text-[10px] uppercase tracking-widest text-[#8A877F]">
                                                    {opt.delivery_time} dias úteis
                                                </p>
                                            )}
                                        </button>
                                    </li>
                                )
                            })}
                        </ul>
                    )}

                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between text-ink"><span>Subtotal</span><span className="font-mono">{brl(cart.subtotal)}</span></div>
                        {cart.discount > 0 && (
                            <div className="flex justify-between text-emerald-800"><span>Desconto</span><span className="font-mono">-{brl(cart.discount)}</span></div>
                        )}
                        <div className="flex justify-between text-ink">
                            <span>Frete{cart.shipping_service ? ` · ${cart.shipping_service}` : ''}</span>
                            <span className="font-mono">{!hasShipping ? '—' : shippingIsFree ? 'Grátis' : brl(cart.shipping)}</span>
                        </div>
                    </div>

                    {cart.coupon_code ? (
                        <div className="flex justify-between items-center mt-5 text-[13px]">
                            <span>Cupom <strong>{cart.coupon_code}</strong></span>
                            <button type="button" onClick={() => requisitar('/api/cart/cupom', { method: 'DELETE' })} className="font-mono text-[11px] uppercase tracking-widest text-red-700 underline">
                                Remover
                            </button>
                        </div>
                    ) : (
                        <div className="flex gap-2 mt-5">
                            <input
                                placeholder="Cupom"
                                value={cupom}
                                onChange={(e) => setCupom(e.target.value)}
                                className="flex-1 border border-border px-3 py-2.5 text-[13px] min-w-0 outline-none focus:border-ink"
                            />
                            <button
                                type="button"
                                onClick={() => requisitar('/api/cart/cupom', { method: 'POST', body: JSON.stringify({ codigo: cupom }) })}
                                disabled={busy !== null || !cupom}
                                className="px-4 py-2.5 bg-ink text-white font-mono text-[11px] uppercase tracking-widest disabled:opacity-40"
                            >
                                Aplicar
                            </button>
                        </div>
                    )}

                    <div className="flex justify-between items-baseline border-t border-border mt-6 pt-5">
                        <span className="text-sm text-ink">Total</span>
                        <span className="font-display italic text-[26px] text-ink">{brl(total)}</span>
                    </div>

                    {hasShipping ? (
                        <a href="/checkout" className="block mt-6 py-4 text-center bg-ink text-white font-mono text-[11px] tracking-[0.16em] uppercase">
                            Finalizar compra
                        </a>
                    ) : (
                        <button
                            type="button"
                            onClick={() => toast.error('Calcule e selecione o frete antes de finalizar.')}
                            className="block w-full mt-6 py-4 bg-[#EDEAE2] text-[#8A877F] font-mono text-[11px] tracking-[0.16em] uppercase"
                        >
                            Selecione o frete
                        </button>
                    )}
                </aside>
            </div>
        </div>
    )
}
