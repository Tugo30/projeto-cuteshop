import { useState } from "react"
import axios from "axios"
import { toast } from "sonner"

const brl = (v) => Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
const onlyDigits = (v) => String(v || "").replace(/\D/g, "")

export default function CardMethod({ data, orderCode, onPaid }) {
    const [enviando, setEnviando] = useState(false)
    const [erro, setErro] = useState(null)
    const [form, setForm] = useState({ number: "", name: "", month: "", year: "", cvv: "" })

    const set = (campo) => (e) => setForm((f) => ({ ...f, [campo]: e.target.value }))

    async function pagar() {
        setEnviando(true)
        setErro(null)
        const pan = onlyDigits(form.number)
        const cvv = onlyDigits(form.cvv)
        const month = onlyDigits(form.month).slice(0, 2)
        const year = onlyDigits(form.year).slice(-2)

        try {
            const tokenRes = await axios.post(`/api/checkout/${orderCode}/cartao/token`, {
                card_number: pan,
            })

            const numberToken = tokenRes.data?.number_token
            if (!numberToken) {
                throw new Error("Nao foi possivel tokenizar o cartao na Getnet.")
            }

            const res = await axios.post(`/api/checkout/${orderCode}/cartao`, {
                number_token: numberToken,
                cardholder_name: form.name,
                expiration_month: month,
                expiration_year: year,
                security_code: cvv,
            })

            setForm({ number: "", name: "", month: "", year: "", cvv: "" })

            if (res.data.paid) {
                toast.success("Pagamento confirmado.")
                onPaid()
                return
            }

            const msg = res.data.payment_label || "Pagamento ainda nao confirmado."
            setErro(msg)
        } catch (e) {
            const msg = e.response?.data?.message || e.message || "Pagamento recusado. Confira os dados do cartao."
            setErro(msg)
            toast.error(msg)
        } finally {
            setForm((f) => ({ ...f, number: "", cvv: "" }))
            setEnviando(false)
        }
    }

    return (
        <div className="mt-10 flex flex-col items-center w-full">
            <p className="font-display italic text-[36px] text-ink m-0">{brl(data.total)}</p>

            <div className="w-full mt-10 space-y-4">
                <input
                    placeholder="Numero do cartao"
                    value={form.number}
                    onChange={set("number")}
                    inputMode="numeric"
                    autoComplete="cc-number"
                    className="w-full px-3 py-2.5 text-sm border border-border outline-none font-body bg-transparent"
                />
                <input
                    placeholder="Nome impresso no cartao"
                    value={form.name}
                    onChange={set("name")}
                    autoComplete="cc-name"
                    className="w-full px-3 py-2.5 text-sm border border-border outline-none font-body bg-transparent"
                />
                <div className="grid grid-cols-3 gap-3">
                    <input
                        placeholder="MM"
                        value={form.month}
                        onChange={set("month")}
                        inputMode="numeric"
                        autoComplete="cc-exp-month"
                        className="px-3 py-2.5 text-sm border border-border outline-none font-body bg-transparent"
                    />
                    <input
                        placeholder="AA"
                        value={form.year}
                        onChange={set("year")}
                        inputMode="numeric"
                        autoComplete="cc-exp-year"
                        className="px-3 py-2.5 text-sm border border-border outline-none font-body bg-transparent"
                    />
                    <input
                        placeholder="CVV"
                        value={form.cvv}
                        onChange={set("cvv")}
                        inputMode="numeric"
                        autoComplete="cc-csc"
                        className="px-3 py-2.5 text-sm border border-border outline-none font-body bg-transparent"
                    />
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
                O numero do cartao e tokenizado na Getnet (POST /v1/tokens/card). A zLuz nao armazena numero nem CVV.
            </p>
        </div>
    )
}
