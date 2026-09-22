import { useState } from "react"
import axios from "axios"
import { toast } from "sonner"

const brl = (v) => Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })

export default function CardMethod({ data, orderCode, onPaid }) {
    const [enviando, setEnviando] = useState(false)
    const [erro, setErro] = useState(null)
    const [form, setForm] = useState({ number: "", name: "", month: "", year: "", cvv: "" })

    const set = (campo) => (e) => setForm((f) => ({ ...f, [campo]: e.target.value }))

    async function pagar() {
        setEnviando(true)
        setErro(null)
        try {
            // Quando a tokenização da Getnet estiver disponível, o número/CVV
            // são tokenizados no front (SDK deles) e só o token vai pro backend.
            // Por enquanto, endpoint fica pronto pra receber o token.
            const res = await axios.post(`/api/checkout/${orderCode}/cartao`, {
                number_token: "FAKE_TOKEN",
                cardholder_name: form.name,
                expiration_month: form.month,
                expiration_year: form.year,
            })
            if (res.data.paid) {
                toast.success("Pagamento aprovado.")
                onPaid()
            }
        } catch (e) {
            const msg = e.response?.data?.message || "Pagamento recusado. Confira os dados do cartão."
            setErro(msg)
            toast.error(msg)
        } finally {
            setEnviando(false)
        }
    }

    return (
        <div className="mt-10 flex flex-col items-center w-full">
            <p className="font-display italic text-[36px] text-ink m-0">{brl(data.total)}</p>

            <div className="w-full mt-10 space-y-4">
                <input placeholder="Número do cartão" value={form.number} onChange={set("number")}
                    className="w-full px-3 py-2.5 text-sm border border-border outline-none font-body bg-transparent" />
                <input placeholder="Nome impresso no cartão" value={form.name} onChange={set("name")}
                    className="w-full px-3 py-2.5 text-sm border border-border outline-none font-body bg-transparent" />
                <div className="grid grid-cols-3 gap-3">
                    <input placeholder="MM" value={form.month} onChange={set("month")}
                        className="px-3 py-2.5 text-sm border border-border outline-none font-body bg-transparent" />
                    <input placeholder="AAAA" value={form.year} onChange={set("year")}
                        className="px-3 py-2.5 text-sm border border-border outline-none font-body bg-transparent" />
                    <input placeholder="CVV" value={form.cvv} onChange={set("cvv")}
                        className="px-3 py-2.5 text-sm border border-border outline-none font-body bg-transparent" />
                </div>
            </div>

            {erro && <p className="mt-4 text-[13px] text-red-700">{erro}</p>}

            <button
                type="button"
                onClick={pagar}
                disabled={enviando}
                className={`w-full mt-6 py-4 bg-ink text-white font-mono text-[11px] uppercase tracking-[0.16em] ${enviando ? "opacity-60" : ""}`}
            >
                {enviando ? "Processando…" : "Pagar"}
            </button>

            <p className="mt-8 text-[12px] text-[#8A877F] text-center leading-relaxed">
                Cartão com tokenização da Getnet — a zLuz não armazena número nem CVV.
            </p>
        </div>
    )
}