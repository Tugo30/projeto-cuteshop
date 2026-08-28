import { useEffect, useState, useCallback } from 'react'

const brl = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const csrf = () => document.querySelector('meta[name="csrf-token"]')?.content ?? ''

const VAZIO = {
    customer_name: '', customer_email: '', customer_phone: '', customer_document: '',
    ship_zipcode: '', ship_street: '', ship_number: '', ship_complement: '',
    ship_district: '', ship_city: '', ship_state: '',
}

export default function CheckoutPage() {
    const [form, setForm] = useState(VAZIO)
    const [cart, setCart] = useState(null)
    const [erros, setErros] = useState({})
    const [erroGeral, setErroGeral] = useState(null)
    const [enviando, setEnviando] = useState(false)
    const [buscandoCep, setBuscandoCep] = useState(false)

    const buscarCep = useCallback(async (zipcode) => {
        const cep = String(zipcode || '').replace(/\D/g, '')
        if (cep.length !== 8) return
        setBuscandoCep(true)
        try {
            const r = await fetch(`https://viacep.com.br/ws/${cep}/json/`)
            const d = await r.json()
            if (d.erro) return
            setForm((f) => ({ ...f, ship_street: d.logradouro || f.ship_street, ship_district: d.bairro || f.ship_district, ship_city: d.localidade || f.ship_city, ship_state: d.uf || f.ship_state }))
        } catch { /* silencia */ } finally { setBuscandoCep(false) }
    }, [])

    useEffect(() => {
        fetch('/api/cart', { credentials: 'same-origin', headers: { Accept: 'application/json' } })
            .then((r) => r.json())
            .then((data) => {
                setCart(data)
                const cepSalvo = data?.shipping_cep || localStorage.getItem('checkout_cep') || ''
                if (cepSalvo) {
                    setForm((f) => ({ ...f, ship_zipcode: cepSalvo }))
                    buscarCep(cepSalvo)
                }
            })
            .catch(() => setErroGeral('Não foi possível carregar sua sacola.'))
    }, [buscarCep])

    const set = (campo) => (e) => {
        const value = e.target.value
        setForm((f) => ({ ...f, [campo]: value }))
        setErros((x) => ({ ...x, [campo]: null }))
        if (campo === 'ship_zipcode') {
            const cleanCep = value.replace(/\D/g, '')
            if (cleanCep.length === 8) buscarCep(cleanCep)
        }
    }

    const enviar = async () => {
        setEnviando(true)
        setErros({})
        setErroGeral(null)
        try {
            const r = await fetch('/api/checkout', {
                method: 'POST', credentials: 'same-origin',
                headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrf() },
                body: JSON.stringify(form),
            })
            if (r.status === 401 || r.status === 419) { window.location.href = '/login'; return }
            const data = await r.json().catch(() => null)
            if (r.status === 422) {
                setErros(data?.errors ?? {})
                setErroGeral(data?.errors?.cart?.[0] ?? 'Confira os campos destacados.')
                return
            }
            if (!r.ok) throw new Error(data?.message || `Erro ${r.status}`)
            window.location.href = data.redirect_to
        } catch (e) {
            setErroGeral(e.message)
        } finally { setEnviando(false) }
    }

    const items = cart?.items ?? []
    const subtotal = cart?.subtotal ?? (cart?.subtotal_cents ? cart.subtotal_cents / 100 : 0)
    const shipping = cart?.shipping ?? (cart?.shipping_cents ? cart.shipping_cents / 100 : null)
    const discount = cart?.discount ?? (cart?.discount_cents ? cart.discount_cents / 100 : 0)
    const total = cart?.total ?? (shipping !== null ? Math.max(0, subtotal - discount + shipping) : subtotal - discount)

    if (cart && !items.length) return (
        <div className="py-24 px-6 text-center">
            <h1 className="font-display italic text-2xl sm:text-[28px] text-ink">Sua sacola está vazia</h1>
            <a href="/#produtos" className="inline-block mt-7 px-8 py-3.5 bg-ink text-white font-mono text-xs tracking-wide uppercase">Ver produtos</a>
        </div>
    )

    return (
        <div className="max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
            <h1 className="font-display italic font-medium text-2xl sm:text-[30px] text-ink mb-8 sm:mb-10">Checkout</h1>

            {erroGeral && <p className="bg-red-50 text-red-700 text-[13px] px-4 py-3 mb-7">{erroGeral}</p>}

            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-8 lg:gap-12 items-start">
                <div>
                    <h2 className="font-mono text-[11px] uppercase tracking-wide text-gray-600 mb-4">Seus dados</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Campo label="Nome completo" span={2} erro={erros.customer_name} value={form.customer_name} onChange={set('customer_name')} />
                        <Campo label="E-mail" type="email" erro={erros.customer_email} value={form.customer_email} onChange={set('customer_email')} />
                        <Campo label="Telefone" erro={erros.customer_phone} value={form.customer_phone} onChange={set('customer_phone')} />
                        <Campo label="CPF" erro={erros.customer_document} value={form.customer_document} onChange={set('customer_document')} />
                    </div>

                    <h2 className="font-mono text-[11px] uppercase tracking-wide text-gray-600 mb-4 mt-10">Entrega</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Campo label={buscandoCep ? 'CEP (buscando…)' : 'CEP'} erro={erros.ship_zipcode} value={form.ship_zipcode} onChange={set('ship_zipcode')} onBlur={() => buscarCep(form.ship_zipcode)} />
                        <Campo label="Número" erro={erros.ship_number} value={form.ship_number} onChange={set('ship_number')} />
                        <Campo label="Rua" span={2} erro={erros.ship_street} value={form.ship_street} onChange={set('ship_street')} />
                        <Campo label="Complemento" erro={erros.ship_complement} value={form.ship_complement} onChange={set('ship_complement')} />
                        <Campo label="Bairro" erro={erros.ship_district} value={form.ship_district} onChange={set('ship_district')} />
                        <Campo label="Cidade" erro={erros.ship_city} value={form.ship_city} onChange={set('ship_city')} />
                        <Campo label="UF" maxLength={2} erro={erros.ship_state} value={form.ship_state}
                            onChange={(e) => { setForm((f) => ({ ...f, ship_state: e.target.value.toUpperCase() })); setErros((x) => ({ ...x, ship_state: null })) }} />
                    </div>
                </div>

                <aside className="border border-border p-5 sm:p-7">
                    <h2 className="font-mono text-[11px] uppercase tracking-wide text-gray-600 mb-5">Resumo</h2>

                    {!cart ? (
                        <p className="text-[13px] text-gray-500">Carregando…</p>
                    ) : (
                        <>
                            <ul className="list-none m-0 mb-5 p-0">
                                {items.map((i) => (
                                    <li key={i.id} className="flex justify-between gap-3 text-[13px] text-ink py-1.5">
                                        <span className="min-w-0">
                                            {i.quantity}× {i.name || i.product_name}
                                            {i.size && <span className="text-gray-500"> · {i.size}</span>}
                                        </span>
                                        <span className="font-mono whitespace-nowrap">{brl(i.line_total || (i.unit_price * i.quantity))}</span>
                                    </li>
                                ))}
                            </ul>

                            <div className="flex justify-between text-sm text-ink py-1"><span>Subtotal</span><span>{brl(subtotal)}</span></div>
                            {discount > 0 && (
                                <div className="flex justify-between text-sm text-green-600 py-1"><span>Desconto</span><span>- {brl(discount)}</span></div>
                            )}
                            <div className="flex justify-between text-sm text-ink py-1">
                                <span>Frete {cart.shipping_service ? `(${cart.shipping_service})` : ''}</span>
                                <span>{shipping === null ? 'Não calculado' : shipping === 0 ? 'Grátis' : brl(shipping)}</span>
                            </div>
                            <div className="flex justify-between text-ink border-t border-border mt-4 pt-4 text-base font-semibold">
                                <span>Total</span><span>{brl(total)}</span>
                            </div>
                        </>
                    )}

                    <button onClick={enviar} disabled={enviando || !items.length}
                        className={`w-full mt-6 py-4 text-center bg-ink text-white font-mono text-xs tracking-wide uppercase ${enviando ? "opacity-60 cursor-default" : "cursor-pointer"}`}>
                        {enviando ? 'Gerando Pix…' : 'Pagar com Pix'}
                    </button>
                    <p className="text-[11px] text-gray-500 text-center mt-3">Você verá o QR code na próxima tela</p>
                </aside>
            </div>
        </div>
    )
}

function Campo({ label, erro, span = 1, ...props }) {
    return (
        <div className={span === 2 ? "sm:col-span-2" : ""}>
            <label className="block font-mono text-[10px] uppercase tracking-wide text-gray-600 mb-1.5">{label}</label>
            <input {...props}
                className={`w-full px-3 py-2.5 text-sm border rounded-sm outline-none font-body ${erro ? "border-red-700" : "border-border"}`} />
            {erro && <p className="text-red-700 text-[11px] mt-1">{erro[0]}</p>}
        </div>
    )
}