import { useEffect, useState, useCallback } from "react"
import axios from "axios"
import PixMethod from "./PixMethod"
import BoletoMethod from "./BoletoMethod"
import CardMethod from "./CardMethod"

export const formatLeft = (s) => {
    const h = Math.floor(s / 3600)
    const m = Math.floor((s % 3600) / 60)
    const sec = s % 60
    if (h > 0) return `${h}h ${String(m).padStart(2, "0")}min`
    return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`
}

export default function PaymentPage({ orderCode }) {
    const [data, setData] = useState(null)
    const [paid, setPaid] = useState(false)
    const [secondsLeft, setSecondsLeft] = useState(null)
    const [erro, setErro] = useState(null)

    const load = useCallback(() => {
        axios
            .get(`/api/checkout/${orderCode}/pagamento`)
            .then((res) => {
                setData(res.data)
                setPaid(res.data.status === "paid")
                if (res.data.expires_at) {
                    const diff = Math.floor((new Date(res.data.expires_at) - new Date()) / 1000)
                    setSecondsLeft(Math.max(0, diff))
                }
            })
            .catch(() => setErro("Nao foi possivel carregar o pagamento."))
    }, [orderCode])

    useEffect(() => {
        load()
    }, [load])

    const checkStatus = useCallback(async () => {
        try {
            const res = await axios.get(`/api/checkout/${orderCode}/status`)
            if (res.data.paid) {
                setPaid(true)
                setData((d) => d ? { ...d, status: res.data.status, payment_label: res.data.payment_label } : d)
                return
            }
            if (res.data.payment_label) {
                setData((d) => d ? { ...d, status: res.data.status, payment_label: res.data.payment_label } : d)
            }
        } catch {
            /* o backend continua sendo a fonte da verdade no proximo ciclo */
        }
    }, [orderCode])

    useEffect(() => {
        if (paid) return
        const id = setInterval(checkStatus, 4000)
        return () => clearInterval(id)
    }, [paid, checkStatus])

    useEffect(() => {
        if (paid || secondsLeft === null || secondsLeft <= 0) return
        const id = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000)
        return () => clearInterval(id)
    }, [paid, secondsLeft])

    if (erro) {
        return (
            <div className="max-w-[480px] mx-auto px-4 py-24 text-center">
                <p className="text-sm text-red-700">{erro}</p>
                <a href="/carrinho" className="inline-block mt-6 font-mono text-[11px] uppercase tracking-widest underline">
                    Voltar a sacola
                </a>
            </div>
        )
    }

    if (!data) {
        return (
            <div className="max-w-[480px] mx-auto px-4 py-24">
                <div className="h-8 w-40 bg-[#EDEAE2] animate-pulse mx-auto mb-8" />
                <div className="h-56 w-56 bg-[#EDEAE2] animate-pulse mx-auto" />
            </div>
        )
    }

    if (paid || data.status === "paid") {
        return (
            <div className="max-w-[520px] mx-auto px-4 py-16 sm:py-24 text-center">
                <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[#8A877F] mb-3">Pedido</p>
                <h1 className="font-display italic text-[32px] sm:text-[40px] text-ink m-0">Pagamento confirmado</h1>
                <p className="mt-4 text-sm text-[#5C5A55] leading-relaxed">
                    O seu pedido: <span className="font-mono text-[12px] text-ink">{data.code}</span> foi RECEBIDO.
                    <br />
                    Estamos preparando-o para que ele chegue com todo o cuidado!
                    <br /><br />
                    Obrigado por comprar com a zLuz! E um prazer te ter conosco.
                </p>
                <a
                    href="/meus-pedidos"
                    className="inline-block mt-10 px-8 py-3.5 bg-ink text-white font-mono text-[11px] uppercase tracking-[0.16em]"
                >
                    Ver meus pedidos
                </a>
            </div>
        )
    }

    const expired = data.status === "expired" || secondsLeft === 0
    const denied = data.status === "canceled" || data.payment_label === "Pagamento recusado"
    const label = data.payment_label || "Pagamento pendente"

    return (
        <div className="max-w-[480px] mx-auto px-4 py-12 sm:py-16">
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[#8A877F] mb-2 text-center">Pagamento</p>
            <h1 className="font-display italic text-[28px] sm:text-[34px] text-ink m-0 text-center">{label}</h1>
            <p className="mt-2 font-mono text-[11px] text-[#8A877F] tracking-wide text-center">{data.code}</p>

            {expired ? (
                <div className="mt-12 text-center">
                    <p className="text-sm text-red-700 mb-6">Esta cobranca expirou.</p>
                    <a href="/carrinho" className="inline-block px-8 py-3.5 border border-ink font-mono text-[11px] uppercase tracking-[0.16em] text-ink">
                        Voltar a sacola
                    </a>
                </div>
            ) : denied ? (
                <div className="mt-12 text-center">
                    <p className="text-sm text-red-700 mb-6">O pagamento foi recusado ou cancelado.</p>
                    <a href="/carrinho" className="inline-block px-8 py-3.5 border border-ink font-mono text-[11px] uppercase tracking-[0.16em] text-ink">
                        Voltar a sacola
                    </a>
                </div>
            ) : (
                <div className="mt-10 flex flex-col items-center w-full">
                    {data.method === "pix" && <PixMethod data={data} secondsLeft={secondsLeft} />}
                    {data.method === "boleto" && <BoletoMethod data={data} secondsLeft={secondsLeft} />}
                    {data.method === "credit_card" && (
                        <CardMethod data={data} orderCode={orderCode} onPaid={() => checkStatus()} />
                    )}
                    <p className="mt-5 text-[12px] text-[#8A877F] text-center leading-relaxed">
                        Esta pagina apenas mostra o estado confirmado pelo servidor. O pagamento so e considerado pago apos a Getnet.
                    </p>
                </div>
            )}
        </div>
    )
}
