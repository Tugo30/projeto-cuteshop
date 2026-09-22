import { useEffect, useState, useCallback } from "react"
import axios from "axios"
import { toast } from "sonner"

const brl = (v) => Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })

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
    const [copied, setCopied] = useState(null)
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
            .catch(() => setErro("Não foi possível carregar o pagamento."))
    }, [orderCode])

    useEffect(() => { load() }, [load])

    const checkStatus = useCallback(async () => {
        try {
            const res = await axios.get(`/api/checkout/${orderCode}/status`)
            if (res.data.paid) setPaid(true)
        } catch { /* silencia */ }
    }, [orderCode])

    useEffect(() => {
        if (paid) return
        const id = setInterval(checkStatus, 4000)
        return () => clearInterval(id)
    }, [paid, checkStatus])

    useEffect(() => {
        if (paid || secondsLeft === null) return
        const id = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000)
        return () => clearInterval(id)
    }, [paid, secondsLeft === null])

    async function copyText(value, key, okMsg) {
        if (!value) return
        await navigator.clipboard.writeText(value)
        setCopied(key)
        toast.success(okMsg)
        setTimeout(() => setCopied(null), 2500)
    }

    if (erro) {
        return (
            <div className="max-w-[480px] mx-auto px-4 py-24 text-center">
                <p className="text-sm text-red-700">{erro}</p>
                <a href="/carrinho" className="inline-block mt-6 font-mono text-[11px] uppercase tracking-widest underline">Voltar à sacola</a>
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

    if (paid) {
        return (
            <div className="max-w-[520px] mx-auto px-4 py-16 sm:py-24 text-center">
                <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[#8A877F]">Pedido</p>
                <p className="font-display italic text-[32px] sm:text-[40px] text-ink m-0">Pagamento confirmado</p>
                <p className="mt-4 text-sm text-[#5C5A55] leading-relaxed">
                    O seu pedido <span className="font-mono text-[12px] text-ink">{data.code}</span> foi recebido.
                </p>
                <a href="/meus-pedidos" className="inline-block mt-10 px-8 py-3.5 bg-ink text-white font-mono text-[11px] uppercase tracking-[0.16em]">Ver meus pedidos</a>
            </div>
        )
    }

    const expired = secondsLeft === 0
    const qrSrc = data.qr_svg || (data.pix_qr_base64 ? `data:image/png;base64,${data.pix_qr_base64}` : null)

    return (
        <div className="max-w-[480px] mx-auto px-4 py-12 sm:py-16">
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[#8A877F] mb-2 text-center">Pagamento</p>
            <h1 className="font-display italic text-[28px] sm:text-[34px] text-ink m-0 text-center">Pague para confirmar</h1>
            <p className="mt-2 font-mono text-[11px] text-[#8A877F] tracking-wide text-center">{data.code}</p>

            {expired ? (
                <div className="mt-12 text-center">
                    <p className="text-sm text-red-700 mb-6">Esta cobrança expirou.</p>
                    <a href="/carrinho" className="inline-block px-8 py-3.5 border border-ink font-mono text-[11px] uppercase tracking-[0.16em] text-ink">Voltar à sacola</a>
                </div>
            ) : (
                <div className="mt-10 flex flex-col items-center">
                    <p className="font-display italic text-[36px] text-ink m-0">{brl(data.total)}</p>
                    {secondsLeft !== null && (
                        <p className="mt-2 font-mono text-[11px] uppercase tracking-widest text-amber-800">Expira em {formatLeft(secondsLeft)}</p>
                    )}

                    {data.pix_payload && (
                        <section className="w-full mt-10">
                            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#8A877F] mb-3 text-center">Pix</p>
                            {qrSrc && <img src={qrSrc} alt="QR Code Pix" className="mx-auto w-56 h-56 bg-white border border-border p-3" />}
                            <textarea readOnly value={data.pix_payload} className="w-full mt-6 text-[10px] font-mono border border-border p-3 h-24 bg-[#FAFAF8] outline-none resize-none" onClick={(e) => e.target.select()} />
                            <button type="button" onClick={() => copyText(data.pix_payload, "pix", "Código Pix copiado.")} className="w-full mt-4 py-4 bg-ink text-white font-mono text-[11px] uppercase tracking-[0.16em]">
                                {copied === "pix" ? "Copiado" : "Copiar código Pix"}
                            </button>
                        </section>
                    )}

                    {(data.barcode || data.ticket_url) && (
                        <section className="w-full mt-10 pt-8 border-t border-border">
                            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#8A877F] mb-3 text-center">Boleto</p>
                            {data.barcode && (
                                <>
                                    <p className="m-0 text-[12px] font-mono text-ink break-all text-center leading-relaxed">{data.barcode}</p>
                                    <button type="button" onClick={() => copyText(data.barcode, "boleto", "Código de barras copiado.")} className="w-full mt-4 py-4 border border-ink text-ink font-mono text-[11px] uppercase tracking-[0.16em] bg-white">
                                        {copied === "boleto" ? "Copiado" : "Copiar código de barras"}
                                    </button>
                                </>
                            )}
                            {data.ticket_url && (
                                <a href={data.ticket_url} target="_blank" rel="noopener noreferrer" className="block w-full mt-3 py-4 text-center bg-ink text-white font-mono text-[11px] uppercase tracking-[0.16em] no-underline">Abrir boleto em PDF</a>
                            )}
                        </section>
                    )}

                    <p className="mt-8 text-[13px] text-[#5C5A55] text-center leading-relaxed">Cartão entra na sequência, com tokenização da Getnet. A zLuz não recebe número nem CVV.</p>
                    <p className="mt-5 text-[12px] text-[#8A877F] text-center leading-relaxed">Depois do pagamento, esta página confirma sozinha em alguns segundos.</p>
                </div>
            )}
        </div>
    )
}
