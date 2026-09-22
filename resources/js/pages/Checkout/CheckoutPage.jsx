import { useEffect, useState, useCallback } from 'react'
import { toast } from 'sonner'

const brl = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const csrf = () => document.querySelector('meta[name="csrf-token"]')?.content ?? ''
const onlyDigits = (v) => String(v || '').replace(/\D/g, '')

export const maskTelefone = (v) => {
    const d = onlyDigits(v).slice(0, 11);
    if (d.length <= 2) return d.replace(/(\d{0,2})/, '($1');
    if (d.length <= 6) return d.replace(/(\d{2})(\d{0,4})/, '($1) $2');
    if (d.length <= 10) return d.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
    return d.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3');
};

export const maskCpfCnpj = (v) => {
    const d = onlyDigits(v).slice(0, 14);
    if (d.length <= 11) {
        return d
            .replace(/(\d{3})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    }
    return d
        .replace(/(\d{2})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1/$2')
        .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
};

export const maskCep = (v) => {
    const d = onlyDigits(v).slice(0, 8);
    return d.replace(/(\d{5})(\d{0,3})/, '$1-$2');
};

const VAZIO = {
    customer_name: '', customer_email: '', customer_phone: '', customer_document: '',
    ship_zipcode: '', ship_street: '', ship_number: '', ship_complement: '',
    ship_district: '', ship_city: '', ship_state: '',
}

const METODOS = [
    { id: 'pix', label: 'Pix', desc: 'Aprovação na hora' },
    { id: 'boleto', label: 'Boleto', desc: 'Até 2 dias úteis' },
    { id: 'credit_card', label: 'Cartão de crédito', desc: 'Aprovação na hora' },
]

const itemImage = (item) =>
    item.image || item.image_url || (item.image_path ? `/storage/${item.image_path}` : null)

export default function CheckoutPage() {
    const [form, setForm] = useState(VAZIO)
    const [cart, setCart] = useState(null)
    const [erros, setErros] = useState({})
    const setMascarado = (campo, maskFn) => (e) => {
        const valor = maskFn(e.target.value);
        setForm((f) => ({ ...f, [campo]: valor }));
        setErros((x) => ({ ...x, [campo]: null }));
    };
    const [erroGeral, setErroGeral] = useState(null)
    const [enviando, setEnviando] = useState(false)
    const [buscandoCep, setBuscandoCep] = useState(false)
    const [paymentMethod, setPaymentMethod] = useState('pix')

    const buscarCep = useCallback(async (zipcode) => {
        const cep = onlyDigits(zipcode)
        if (cep.length !== 8) return
        setBuscandoCep(true)
        try {
            const r = await fetch(`https://viacep.com.br/ws/${cep}/json/`)
            const d = await r.json()
            if (d.erro) {
                toast.error('CEP não encontrado.')
                return
            }
            setForm((f) => ({
                ...f,
                ship_street: d.logradouro || f.ship_street,
                ship_district: d.bairro || f.ship_district,
                ship_city: d.localidade || f.ship_city,
                ship_state: d.uf || f.ship_state,
            }))
        } catch {
            toast.error('Não foi possível consultar o CEP.')
        } finally {
            setBuscandoCep(false)
        }
    }, [])

    useEffect(() => {
        fetch('/api/cart', { credentials: 'same-origin', headers: { Accept: 'application/json' } })
            .then((r) => r.json())
            .then((data) => {
                setCart(data)
                const cepSalvo = data?.shipping_cep || localStorage.getItem('checkout_cep') || ''
                if (cepSalvo) {
                    setForm((f) => ({ ...f, ship_zipcode: maskCep(cepSalvo) }))
                    buscarCep(cepSalvo)
                }
            })
            .catch(() => setErroGeral('Não foi possível carregar sua sacola.'))
    }, [buscarCep])

    const set = (campo) => (e) => {
        const value = e.target.value
        setForm((f) => ({ ...f, [campo]: value }))
        setErros((x) => ({ ...x, [campo]: null }))
        if (campo === 'ship_zipcode' && onlyDigits(value).length === 8) {
            buscarCep(value)
        }
    }

    const hasShipping = Boolean(cart?.shipping_service && cart?.shipping_cents != null)
    const items = cart?.items ?? []
    const subtotal = cart?.subtotal ?? 0
    const discount = cart?.discount ?? 0
    const shipping = hasShipping ? Number(cart.shipping) : null
    const total = cart?.total ?? Math.max(0, subtotal - discount + (shipping ?? 0))

    const botaoPagar = enviando ? 'Gerando pagamento…' : 'Finalizar e pagar'

    const enviar = async () => {
        if (!hasShipping) {
            toast.error('Volte à sacola e selecione o frete antes de pagar.')
            return
        }

        setEnviando(true)
        setErros({})
        setErroGeral(null)

        try {
            const r = await fetch('/api/checkout', {
                method: 'POST',
                credentials: 'same-origin',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': csrf(),
                },
                body: JSON.stringify({
                    ...form,
                    payment_method: paymentMethod,
                    ship_zipcode: onlyDigits(form.ship_zipcode),
                    customer_phone: onlyDigits(form.customer_phone),
                    customer_document: onlyDigits(form.customer_document),
                }),
            })

            if (r.status === 401 || r.status === 419) {
                window.location.href = '/login'
                return
            }

            const data = await r.json().catch(() => null)

            if (r.status === 409 && data?.redirect_to) {
                window.location.href = data.redirect_to
                return
            }

            if (r.status === 422) {
                setErros(data?.errors ?? {})
                const msg = data?.errors?.cart?.[0] ?? data?.message ?? 'Confira os campos destacados.'
                setErroGeral(msg)
                toast.error(msg)
                return
            }

            if (!r.ok) throw new Error(data?.message || 'Não foi possível iniciar o pagamento.')
            window.location.href = data.redirect_to
        } catch (e) {
            setErroGeral(e.message)
            toast.error(e.message)
        } finally {
            setEnviando(false)
        }
    }

    if (cart && !items.length) {
        return (
            <div className="py-24 px-6 text-center">
                <h1 className="font-display italic text-2xl sm:text-[28px] text-ink">Sua sacola está vazia</h1>
                <a href="/#produtos" className="inline-block mt-7 px-8 py-3.5 bg-ink text-white font-mono text-xs tracking-wide uppercase">
                    Ver produtos
                </a>
            </div>
        )
    }

    return (
        <div className="max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
            <h1 className="font-display italic font-medium text-2xl sm:text-[30px] text-ink mb-2">Checkout</h1>
            <p className="font-mono text-xs text-gray-500 tracking-wide mb-8 sm:mb-10">
                Confira os dados e finalize
            </p>

            {erroGeral && (
                <p className="bg-red-50 text-red-700 text-[13px] px-4 py-3 mb-7">{erroGeral}</p>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px] gap-8 lg:gap-12 items-start">
                <div>
                    <h2 className="font-mono text-[11px] uppercase tracking-widest text-gray-500 mb-4">Seus dados</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Campo label="Nome completo" span={2} erro={erros.customer_name} value={form.customer_name} onChange={set('customer_name')} autoComplete="name" />
                        <Campo label="E-mail" type="email" erro={erros.customer_email} value={form.customer_email} onChange={set('customer_email')} autoComplete="email" />
                        <Campo
                            label="Telefone"
                            erro={erros.customer_phone}
                            value={form.customer_phone}
                            onChange={setMascarado('customer_phone', maskTelefone)}
                            inputMode="numeric"
                            autoComplete="tel"
                        />
                        <Campo
                            label="CPF"
                            erro={erros.customer_document}
                            value={form.customer_document}
                            onChange={setMascarado('customer_document', maskCpfCnpj)}
                            inputMode="numeric"
                            autoComplete="off"
                        />
                    </div>

                    <h2 className="font-mono text-[11px] uppercase tracking-widest text-gray-500 mb-4 mt-10">Entrega</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Campo
                            label={buscandoCep ? 'CEP (buscando…)' : 'CEP'}
                            erro={erros.ship_zipcode}
                            value={form.ship_zipcode}
                            onChange={setMascarado('ship_zipcode', maskCep)}
                            onBlur={() => buscarCep(form.ship_zipcode)}
                            inputMode="numeric"
                            maxLength={9}
                            autoComplete="postal-code"
                        />
                        <Campo label="Número" erro={erros.ship_number} value={form.ship_number} onChange={set('ship_number')} />
                        <Campo label="Rua" span={2} erro={erros.ship_street} value={form.ship_street} onChange={set('ship_street')} autoComplete="street-address" />
                        <Campo label="Complemento" erro={erros.ship_complement} value={form.ship_complement} onChange={set('ship_complement')} />
                        <Campo label="Bairro" erro={erros.ship_district} value={form.ship_district} onChange={set('ship_district')} />
                        <Campo label="Cidade" erro={erros.ship_city} value={form.ship_city} onChange={set('ship_city')} />
                        <Campo
                            label="UF"
                            maxLength={2}
                            erro={erros.ship_state}
                            value={form.ship_state}
                            onChange={(e) => {
                                setForm((f) => ({ ...f, ship_state: e.target.value.toUpperCase() }))
                                setErros((x) => ({ ...x, ship_state: null }))
                            }}
                        />
                    </div>
                </div>

                <aside className="border border-border p-5 sm:p-7 bg-white">
                    <h2 className="font-mono text-[11px] uppercase tracking-widest text-gray-500 mb-5">Resumo</h2>

                    {!cart ? (
                        <p className="text-[13px] text-gray-500">Carregando…</p>
                    ) : (
                        <>
                            <ul className="list-none m-0 mb-5 p-0">
                                {items.map((i) => {
                                    const img = itemImage(i)
                                    return (
                                        <li key={i.id} className="flex gap-3 py-2.5 border-b border-border last:border-0">
                                            <div className="w-12 h-14 flex-shrink-0 bg-[#F1F1EF] overflow-hidden">
                                                {img ? (
                                                    <img src={img} alt={i.name} className="w-full h-full object-cover" />
                                                ) : null}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="m-0 text-[13px] text-ink truncate">{i.name}</p>
                                                <p className="m-0 mt-1 font-mono text-[11px] text-gray-500">
                                                    {i.quantity}× {i.size ? `TAM ${i.size}` : brl(i.unit_price)}
                                                </p>
                                            </div>
                                            <span className="font-mono text-[13px] whitespace-nowrap">{brl(i.line_total)}</span>
                                        </li>
                                    )
                                })}
                            </ul>

                            <div className="flex justify-between text-sm text-ink py-1.5">
                                <span>Subtotal</span><span>{brl(subtotal)}</span>
                            </div>
                            {discount > 0 && (
                                <div className="flex justify-between text-sm text-emerald-700 py-1.5">
                                    <span>Desconto</span><span>-{brl(discount)}</span>
                                </div>
                            )}
                            <div className="flex justify-between text-sm text-ink py-1.5">
                                <span>Frete{cart.shipping_service ? ` (${cart.shipping_service})` : ''}</span>
                                <span>
                                    {!hasShipping ? 'Não calculado' : Number(cart.shipping_cents) === 0 ? 'Grátis' : brl(shipping)}
                                </span>
                            </div>
                            <div className="flex justify-between text-ink border-t border-border mt-4 pt-4 text-base font-semibold">
                                <span>Total</span><span>{brl(total)}</span>
                            </div>
                        </>
                    )}

                    {hasShipping ? (
                        <button
                            onClick={enviar}
                            disabled={enviando || !items.length}
                            className={`w-full mt-6 py-4 text-center bg-ink text-white font-mono text-xs tracking-wide uppercase ${enviando ? 'opacity-60' : ''}`}
                        >
                            {botaoPagar}
                        </button>
                    ) : (
                        <div className="mt-6">
                            <p className="text-[12px] text-amber-800 mb-3">Selecione o frete na sacola antes de pagar.</p>
                            <a href="/carrinho" className="block py-4 text-center bg-ink text-white font-mono text-xs tracking-wide uppercase">
                                Voltar à sacola
                            </a>
                        </div>
                    )}
                    

                    <div className="mt-6 pt-6 border-t border-border">
                        <h2 className="font-mono text-[11px] uppercase tracking-widest text-gray-500 mb-3">
                            Forma de pagamento
                        </h2>
                        <div className="space-y-2">
                            {METODOS.map((m) => (
                                <label
                                    key={m.id}
                                    className={`flex items-center justify-between px-4 py-3 border cursor-pointer transition-colors ${paymentMethod === m.id ? 'border-ink bg-[#FAFAF8]' : 'border-border'
                                        }`}
                                >
                                    <span>
                                        <span className="block text-sm text-ink">{m.label}</span>
                                        <span className="block font-mono text-[10px] text-gray-500 mt-0.5">{m.desc}</span>
                                    </span>
                                    <input
                                        type="radio"
                                        name="payment_method"
                                        value={m.id}
                                        checked={paymentMethod === m.id}
                                        onChange={() => setPaymentMethod(m.id)}
                                        className="accent-[#16161A]"
                                    />
                                </label>
                            ))}
                        </div>
                    </div>
                </aside>
            </div>
        </div>
    )
}

function Campo({ label, erro, span = 1, ...props }) {
    return (
        <div className={span === 2 ? 'sm:col-span-2' : ''}>
            <label className="block font-mono text-[10px] uppercase tracking-wide text-gray-500 mb-1.5">{label}</label>
            <input
                {...props}
                className={`w-full px-3 py-2.5 text-sm border outline-none font-body bg-transparent ${erro ? 'border-red-700' : 'border-border'}`}
            />
            {erro && <p className="text-red-700 text-[11px] mt-1">{erro[0]}</p>}
        </div>
    )
}
