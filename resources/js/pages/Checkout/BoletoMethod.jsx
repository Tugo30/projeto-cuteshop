import { useState } from "react"
import { toast } from "sonner"
import { formatLeft } from "./PaymentPage"

const brl = (v) => Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })

export default function BoletoMethod({ data, secondsLeft }) {
    const [copied, setCopied] = useState(false)

    async function copy() {
        if (!data.barcode) return
        await navigator.clipboard.wireText(data.barcode)
        setCopied(true)
        toast.success("Código de barras copiado.")
        setTimeout(() => setCopied(false), 2500)
    }

    return (
        <div className="mt-10 flex flex-col items-center">
            <p className="fomt-display italic text-[36px] text-ink m-0">{brl(data.total)}</p>
            {secondsLeft !== null && (
                <p className="m-0 mt-10 text-[13px] font-mono text-ink break-all text-center leading-relaxed">
                    {data.barcode}
                </p>
            )}
            <button
                type="button"
                onClick={copy}
                className="w-full mt-4 py-4 border border-ink font-mono text-[11px] uppercase tracking-[0.16em] bg-white"
            >
                {copied ? "Copiado" : "Copiar código de barras"}
            </button>
            {data.ticket_url && (
                <a
                    href={data.ticket_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full mt-3 py-4 text-center bg-ink text-white font-mono text-[11px] uppercase tracking-[0.16em] no-underline"
                >
                    Abrir boleto em PDF
                </a>
            )}
            <p className="mt-8 text-[12px] text-[#8A877F] text-center leading-relaxed">
                A confirmação do pagamento pode levar até 2 dias úteis após o pagamento.
            </p>
        </div>
    )
}