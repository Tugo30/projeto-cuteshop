import { useEffect, useState, useCallback } from "react"
import axios from "axios"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function PixPayment({ orderCode }) {
    const [data, setData] = useState(null)
    const [paid, setPaid] = useState(false)
    const [copied, setCopied] = useState(false)
    const [secondsLeft, setSecondsLeft] = useState(null)

    // carrega QR + payload
    useEffect(() => {
        axios.get(`/api/checkout/${orderCode}/pix`)
            .then(res => {
                setData(res.data)
                setPaid(res.data.status === "paid")
                if (res.data.expires_at) {
                    const diff = Math.floor((new Date(res.data.expires_at) - new Date()) / 1000)
                    setSecondsLeft(Math.max(0, diff))
                }
            })
            .catch(err => console.error(err))
    }, [orderCode])

    // polling do status
    const checkStatus = useCallback(async () => {
        try {
            const res = await axios.get(`/api/checkout/${orderCode}/status`)
            if (res.data.paid) setPaid(true)
        } catch (e) { /* silencia */ }
    }, [orderCode])

    useEffect(() => {
        if (paid) return
        const id = setInterval(checkStatus, 5000)
        return () => clearInterval(id)
    }, [paid, checkStatus])

    // countdown
    useEffect(() => {
        if (paid || secondsLeft === null || secondsLeft <= 0) return
        const id = setInterval(() => setSecondsLeft(s => Math.max(0, s - 1)), 1000)
        return () => clearInterval(id)
    }, [paid, secondsLeft])

    async function copyPayload() {
        await navigator.clipboard.writeText(data.pix_payload)
        setCopied(true)
        setTimeout(() => setCopied(false), 2500)
    }

    const mmss = s =>
        `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`

    if (!data) return <p className="text-sm text-neutral-500">Carregando pagamento...</p>

    if (paid) {
        return (
            <Card className="max-w-md mx-auto">
                <CardContent className="py-10 text-center">
                    <div className="text-5xl mb-4">✅</div>
                    <h2 className="text-xl font-bold mb-2">Pagamento confirmado!</h2>
                    <p className="text-sm text-neutral-600 mb-6">
                        Pedido <strong>{data.code}</strong> está sendo preparado.
                    </p>
                    <Button onClick={() => (window.location.href = "/profile")}>
                        Ver meus pedidos
                    </Button>
                </CardContent>
            </Card>
        )
    }

    const expired = secondsLeft === 0

    return (
        <Card className="max-w-md mx-auto">
            <CardHeader>
                <CardTitle className="text-base">Pague com Pix</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-4">
                {expired ? (
                    <div className="text-center py-6">
                        <p className="text-red-600 font-semibold mb-2">Cobrança expirada</p>
                        <Button variant="outline" onClick={() => (window.location.href = "/carrinho")}>
                            Voltar ao carrinho
                        </Button>
                    </div>
                ) : (
                    <>
                        <div className="text-2xl font-bold">
                            R$ {(data.total ?? 0).toFixed(2).replace(".", ",")}                           
                        </div>

                        {secondsLeft !== null && (
                            <div className="text-sm text-amber-600">
                                Expira em {mmss(secondsLeft)}
                            </div>
                        )}

                        {data.qr_svg && (
                            <img src={data.qr_svg} alt="QR Code Pix"
                                 className="w-56 h-56 border rounded-lg p-2 bg-white" />
                        )}

                        <div className="w-full">
                            <p className="text-xs text-neutral-500 mb-1">Pix Copia e Cola</p>
                            <textarea
                                readOnly
                                value={data.pix_payload}
                                className="w-full text-[10px] font-mono border rounded p-2 h-20 bg-neutral-50"
                                onClick={e => e.target.select()}
                            />
                        </div>

                        <Button onClick={copyPayload} className="w-full bg-black text-white">
                            {copied ? "✓ Copiado!" : "Copiar código Pix"}
                        </Button>

                        <p className="text-xs text-neutral-400 text-center">
                            Após o pagamento, esta página confirma automaticamente em alguns segundos.
                        </p>
                    </>
                )}
            </CardContent>
        </Card>
    )
}