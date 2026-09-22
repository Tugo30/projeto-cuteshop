import { useEffect, useRef, useState } from "react"
import { X, ChevronLeft, ChevronRight } from "lucide-react"

export default function ImageLightbox({ images = [], index = 0, onIndex, onClose }) {
    const touchStartX = useRef(null)
    const [loaded, setLoaded] = useState(false)
    const total = images.length
    const current = images[index]

    function goTo(i) {
        if (total === 0) return
        setLoaded(false)
        onIndex?.((i + total) % total)
    }
    const goPrev = () => goTo(index - 1)
    const goNext = () => goTo(index + 1)

    useEffect(() => {
        function onKeyDown(e) {
            if (e.key === "Escape") onClose?.()
            if (e.key === "ArrowLeft") goPrev()
            if (e.key === "ArrowRight") goNext()
        }
        document.addEventListener("keydown", onKeyDown)
        const prevOverflow = document.body.style.overflow
        document.body.style.overflow = "hidden"
        return () => {
            document.removeEventListener("keydown", onKeyDown)
            document.body.style.overflow = prevOverflow
        }
    }, [index, total])

    if (!current) return null

    function handleTouchStart(e) {
        touchStartX.current = e.touches[0].clientX
    }
    function handleTouchEnd(e) {
        if(touchStartX.current == null) return
        const delta = e.changedTouches[0].clientX - touchStartX.current
        if(Math.abs(delta) > 50) (delta > 0 ? goPrev() : goNext())
            touchStartX.current = null
    }

    return (
        <div
            className="fixed inset-0 z-[100] flex flex-col bg-black/95"
            role="dialog"
            aria-modal="true"
            onClick={onClose}
        >
            <div className="flex items-center justify-between px-4 py-3 text-white sm:px-6 sm:py-4" onClick={(e) => e.stopPropagation()}>
                <button type="button" onClick={onClose} aria-label="Fechar" className="rounded-full p-2 text-white/80 transition hover:bg-white/10 hover:text-white">
                    <X size={22} />
                </button>
            </div>

            <div
                className="relative flex flex-1 items-center justify-center overflow-hidden px-2 sm:px-4"
                onClick={(e) => e.stopPropagation()}
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
            >
                {total > 1 && (
                    <button type="button" onClick={goPrev} aria-label="Foto anterior"
                        className="absolute left-1 z-10 hidden rounded-full bg-black/40 p-2 text-white transition hover:bg-black/60 sm:left-3 sm:block">
                            <ChevronLeft size={26} />
                    </button>
                )}

                {!loaded && (
                    <div className="absolute h-10 w-10 animate-spin rounded-full border-2 border-white/20 border-t-white/80" />
                )}

                <img 
                    src={current}
                    alt=""
                    draggable={false}
                    onLoad={() => setLoaded(true)}
                    className={`max-h-[80vh] max-w-full select-none object-contain transition-opacity duration-200 sm:max-h-[85vh] ${loaded ? "opacity-100" : "opacity-0"}`}
                />

                {total > 1 && (
                    <button type="button" onClick={goNext} aria-label="Próxima foto"
                    className="absolute right-1 z-10 hidden rounded-full bg-black/40 p-2 text-white transition hover:bg-black/60 sm:right-3 sm:block">
                        <ChevronRight size={26} />  
                    </button>
                )}
            </div>

                {total > 1 && (
                    <div className="flex items-center justify-center gap-8 sm:hidden" onClick={(e) => e.stopPropagation()}>
                        <button type="button" onClick={goPrev} aria-label="Foto anterior" className="rounded-full bg-white/10 p-3 text-white" >
                            <ChevronLeft size={20} />
                        </button>
                        <button type="button" onClick={goNext} aria-label="Próxima foto" className="rounded-full bg-white/10 p-3 text-white">
                            <ChevronRight size={20} />
                        </button>
                    </div>
                )}

                {total > 1 && (
                    <div className="hidden gap-2 overflow-x-auto px-6 pb-5 sm:flex" onClick={(e) => e.stopPropagation()}>
                        {images.map((src, i) => (
                            <button key={src + i} type="button" onClick={() => goTo(i)}
                                className={`h-14 w-14 flex-shrink-0 overflow-hidden-2 transition ${i === index ? "border-white" : "border-transparent opacity-50 hover:opacity-80"}`}
                            >
                                <img src={src} alt="" className="h-full w-full object-cover" />
                            </button>
                        ))}
                    </div>
                )}

        </div>
    )
}