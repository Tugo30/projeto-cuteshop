import {useState} from "react"
import {toast} from "sonner"
import {formatLeft} from "./PaymentPage"

const brl = (v) => Number(v || 0).toLocaleString("pt-BR", {style: "currency", currency: "BRL"})

export default function pixMethod({data, secondsLeft}) {
    const [copied, setCopied] = useState(false)
    const qrSrc = data.qr_svg || (data.pix_qr_base64 ? `data:image/png;base64,${data.pix_qr_base64}` : null)

    async function copy() {
        if(!data.pix_payload) return
        await navigator.clipboard.writeText(data.pix_payload)
        setCopied(true)
        toast.success("Código Pix copiado.")
        setTimeout(() => setCopied(false), 2500)
    }


    return (
        <div className="mt-10 flex flex-col items-center">
            <p className="font-display italic text-[36px] text-ink m-0">{brl(data.total)}</p>
            {secondsLeft !== null && (
                <p className="mt-2 font-mono text-[11px] uppercase tracking-widest text-amber-800 ">
                    Expira em {formatLeft(secondsLeft)}
                </p>
            )}
            {qrSrc && (
                <img src={qrSrc} alt="QR Code Pix" className="mx-auto mt-10 w-56 h-56 bg-white border border-border p-3" />
            )}
            <textarea 
                readOnly
                value={data.pix_payload || ""}
                className="w-full mt-6 text-[10px] font-mono border border-border p-3 h-24 bg-[#FAFAF8] outline-none resize-none"
                onClick={(e) => e.target.select()}
            />

            <button
                type="button"
                onClick={copy}
                className="w-full mt-4 py-4 bg-ink text-white font-mono text-[11px] uppercase tracking-[0.16em]"
            >
                {copied ? "Copiado" : "Copiar código"}
            </button>
            <p className="mt-8 text-[12px] text-[#8A877F] text-center leading-relaxed">
                Depois do pagamento, esta página confirma sozinha em alguns segundos.
            </p>
        </div>
    )

}

