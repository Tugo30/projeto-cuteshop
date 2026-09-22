import { useMemo, useState } from "react"
import axios from "axios"
import { X as XIcon, ImagePlus } from "lucide-react"
import ImageLightbox from "@/components/ImageLightbox"

const csrf = () => document.querySelector('meta[name="csrf-token"]')?.content

function photoSrc(p) {
    if (!p) return null
    if (typeof p === "string") {
        if (p.startsWith("http") || p.startsWith("/")) return p
        return `/storage/${p}`
    }
    if (p.path) {
        return p.path.startsWith("http") || p.path.startsWith("/") ? p.path : `/storage/${p.path}`
    }
    return null
}

export default function ReviewForm({ productId, reviews = [], ratingAvg, onSubmitted }) {
    const [rating, setRating] = useState(0)
    const [hoverRating, setHoverRating] = useState(0)
    const [comment, setComment] = useState("")
    const [photos, setPhotos] = useState([])
    const [sending, setSending] = useState(false)
    const [erro, setErro] = useState(null)
    const [naoElegivel, setNaoElegivel] = useState(false)
    const [sucesso, setSucesso] = useState(false)

    function handlePhotos(e) {
        const novas = Array.from(e.target.files).slice(0, 3 - photos.length)
        setPhotos((prev) => [...prev, ...novas].slice(0, 3))
        e.target.value = ""
    }

    function removerFoto(i) {
        setPhotos((prev) => prev.filter((_, idx) => idx !== i))
    }

    async function enviar() {
        if (!rating) {
            setErro("Selecione uma nota de 1 a 5 estrelas.")
            return
        }
        setSending(true)
        setErro(null)

        const form = new FormData()
        form.append("rating", rating)
        if (comment) form.append("comment", comment)
        photos.forEach((file) => form.append("photos[]", file))

        try {
            await axios.post(`/produtos/${productId}/avaliacoes`, form, {
                headers: { "X-CSRF-TOKEN": csrf() },
            })
            setSucesso(true)
            setComment("")
            setRating(0)
            setPhotos([])
            onSubmitted?.()
        } catch (err) {
            if (err.response?.status === 401) {
                window.location.href = "/login"
                return
            }
            if (err.response?.status === 403) setNaoElegivel(true)
            else if (err.response?.status === 429) setErro("Aguarde um minuto para enviar de novo.")
            else setErro(err.response?.data?.message || "Não foi possível enviar sua avaliação.")
        } finally {
            setSending(false)
        }
    }

    if (naoElegivel) {
        return (
            <div className="space-y-8 sm:space-y-10">
                <p className="text-[13px] italic text-gray-500">
                    Você poderá avaliar este produto após recebê-lo.
                </p>
                <ReviewsSection reviews={reviews} ratingAvg={ratingAvg} />
            </div>
        )
    }

    return (
        <div className="space-y-8 sm:space-y-12">
            <div>
                <h2 className="mt-5 mb-3 text-[11px] font-medium uppercase tracking-[0.18em] text-neutral-900">
                    Deixe sua avaliação
                </h2>
                {sucesso && (
                    <p className="mb-4 text-[13px] text-green-700">
                        Avaliação enviada. Agradecemos pelo retorno.
                    </p>
                )}

                <div className="border border-neutral-200 bg-white p-6">
                    <p className="mb-5 text-[11px] text-neutral-400">
                        Disponível após o pedido ser entregue. Enviar de novo atualiza a avaliação.
                    </p>

                    <div className="mb-5 flex gap-1">
                        {[1, 2, 3, 4, 5].map((n) => (
                            <button
                                key={n}
                                type="button"
                                onClick={() => setRating(n)}
                                onMouseEnter={() => setHoverRating(n)}
                                onMouseLeave={() => setHoverRating(0)}
                                className="text-2xl leading-none"
                                aria-label={`${n} estrela(s)`}
                            >
                                <span className={(hoverRating || rating) >= n ? "text-neutral-900" : "text-neutral-300"}>
                                    ★
                                </span>
                            </button>
                        ))}
                    </div>

                    <textarea
                        placeholder="Conte como foi sua experiência (opcional)"
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        rows={3}
                        maxLength={1000}
                        className="mb-4 w-full border border-neutral-200 p-3 text-sm outline-none focus:border-neutral-900"
                    />

                    <label className="mb-2 block text-[11px] text-neutral-500">
                        Fotos do produto (opcional, até 3)
                    </label>
                    <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        multiple
                        onChange={handlePhotos}
                        className="mb-4 text-xs"
                    />

                    {photos.length > 0 && (
                        <div className="mb-5 flex gap-2">
                            {photos.map((f, i) => (
                                <div key={i} className="h-14 w-14 overflow-hidden bg-[#EFEDE8]">
                                    <img src={URL.createObjectURL(f)} alt="" className="h-full w-full object-cover" />
                                </div>
                            ))}
                        </div>
                    )}

                    {erro && <p className="mb-3 text-xs text-red-700">{erro}</p>}

                    <button
                        type="button"
                        onClick={enviar}
                        disabled={sending}
                        className="bg-neutral-900 px-6 py-2.5 text-[11px] font-medium uppercase tracking-[0.18em] text-white disabled:opacity-50"
                    >
                        {sending ? "Enviando..." : sucesso ? "Atualizar avaliação" : "Enviar avaliação"}
                    </button>
                </div>
            </div>

            <ReviewsSection reviews={reviews} ratingAvg={ratingAvg} />
        </div>
    )
}

function ReviewsSection({ reviews, ratingAvg }) {
    const list = Array.isArray(reviews) ? reviews : []
    const [open, setOpen] = useState(null)

    const gallery = useMemo(() => {
        const shots = []
        for (const r of list) {
            for (const p of r.photos ?? r.images ?? []) {
                const src = photoSrc(p)
                if (src) shots.push(src)
            }
        }
        return shots
    }, [list])

    function openFrom(src) {
        const i = gallery.indexOf(src)
        if (i >= 0) setOpen(i)
    }

    return (
        <div className="border-t border-neutral-200 pt-8 sm:pt-10">
            <div className="mb-6 flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
                <h2 className="text-[11px] font-medium uppercase tracking-[0.18em] text-neutral-900">
                    Avaliações dos clientes
                </h2>
                {ratingAvg != null && reviews.length > 0 && (
                    <p className="m-0 text-xs text-neutral-500">
                        <span className="text-neutral-900">★ {Number(ratingAvg).toFixed(1)}</span>
                        {" · "}
                        {reviews.length} {reviews.length === 1 ? "avaliação" : "avaliações"}
                    </p>
                )}
            </div>
            {!reviews?.length ? (
                <p className="text-[13px] italic text-neutral-400">Este produto ainda não tem avaliações.</p>
            ) : (
                <ul className="m-0 grid list-none gap-4 p-0 sm:grid-cols-2">
                    {reviews.map((r) => {
                        const shots = (r.photos ?? r.images ?? []).map(photoSrc).filter(Boolean)
                        return (
                            <li key={r.id} className="border border-neutral-200 bg-white p-5">
                                <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                                    <span className="text-sm font-medium text-neutral-900">
                                        {r.user?.username ?? r.user?.name ?? "Cliente"}
                                    </span>
                                    <span className="text-xs tracking-widest text-neutral-900">
                                        {"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}
                                    </span>
                                </div>
                                {r.created_at && (
                                    <p className="m-0 text-[10px] uppercase tracking-widest text-neutral-400">
                                        {new Date(r.created_at).toLocaleDateString("pt-BR")}
                                    </p>
                                )}
                                {r.comment && (
                                    <p className="mb-0 mt-3 text-xs leading-relaxed text-neutral-600 break-words">{r.comment}</p>
                                )}
                                {shots.length > 0 && (
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        {shots.map((src, i) => (
                                            <button
                                                key={i}
                                                type="button"
                                                onClick={() => openFrom(src)}
                                                className="block h-20 w-20 overflow-hidden border-0 bg-[#F1F1EF] p-0"
                                            >
                                                <img src={src} alt="" className="h-full w-full object-cover" />
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </li>
                        )
                    })}
                </ul>
            )}

            {open != null && (
                <ImageLightbox images={gallery} index={open} onIndex={setOpen} onClose={() => setOpen(null)} />
            )}
        </div>
    )
}