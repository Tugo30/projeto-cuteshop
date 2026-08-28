import { useId } from "react"
import { Swiper, SwiperSlide } from 'swiper/react'
import { Navigation, Pagination } from 'swiper/modules'
import 'swiper/css'
import 'swiper/css/pagination'

function getDisplayPrice(product) {
    if (!Array.isArray(product?.variants) || product.variants.length === 0) return null
    const prices = product.variants.map(v => Number(v.price)).filter(p => !isNaN(p))
    if (prices.length === 0) return null
    return Math.min(...prices)
}

export default function HomeCarousels({ products, title = "Destaques" }) {
    if (!products || products.length === 0) return null

    // Classe única por instância — evita conflito se houver mais de um carrossel na página
    const uid = useId().replace(/:/g, "")
    const prevClass = `swiper-btn-prev-${uid}`
    const nextClass = `swiper-btn-next-${uid}`

    return (
        <section className="max-w-[1400px] w-full mx-auto px-4 sm:px-6 lg:px-12 pb-10 sm:pb-14 box-border">
            <div className="flex justify-between items-center mb-5">
                <p className="font-mono text-xs tracking-widest uppercase text-ink font-semibold m-0">
                    {title}
                </p>
                <div className="flex gap-2">
                    <button className={`swiper-btn-prev ${prevClass}`} aria-label="Anterior">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="15 18 9 12 15 6" />
                        </svg>
                    </button>
                    <button className={`swiper-btn-next ${nextClass}`} aria-label="Próximo">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="9 18 15 12 9 6" />
                        </svg>
                    </button>
                </div>
            </div>

            <Swiper
                className="custom-swiper-container"
                modules={[Navigation, Pagination]}
                navigation={{ prevEl: `.${prevClass}`, nextEl: `.${nextClass}` }}
                pagination={{ clickable: true }}
                spaceBetween={16}
                slidesPerView={1.4}
                breakpoints={{
                    480: { slidesPerView: 2, spaceBetween: 20 },
                    768: { slidesPerView: 3, spaceBetween: 24 },
                    1280: { slidesPerView: 4, spaceBetween: 24 },
                }}
            >
                {products.map(p => {
                    const cover = p.images?.length ? p.images[0].url : p.image
                    return (
                        <SwiperSlide key={p.id}>
                            <a href={`/produtos/${p.id}`} className="block text-inherit no-underline group">
                                <div className="aspect-[3/4] bg-[#EFEDE8] rounded-sm overflow-hidden mb-3">
                                    {cover && (
                                        <img
                                            src={cover}
                                            alt={p.name}
                                            className="w-full h-full object-cover transition-transform duration-400 ease-out group-hover:scale-105"
                                        />
                                    )}
                                </div>
                                <p className="text-sm text-ink mb-1 font-medium">{p.name}</p>
                                {getDisplayPrice(p) !== null && (
                                    <p className="text-[13px] text-gray-600 m-0">
                                        A partir de <span className="font-semibold text-ink">R$ {getDisplayPrice(p).toFixed(2).replace(".", ",")}</span>
                                    </p>
                                )}
                            </a>
                        </SwiperSlide>
                    )
                })}
            </Swiper>
        </section>
    )
}