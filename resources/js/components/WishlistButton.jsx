import { useState, useEffect } from "react"
import axios from "axios"

export default function WishlistButton({ productId, size = 18, className = "" }) {
    const [inWishlist, setInWishlist] = useState(false)
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        axios.get(`/wishlist/${productId}/check`)
            .then(res => setInWishlist(res.data.in_wishlist))
            .catch(() => { })
    }, [productId])

    async function toggle(e) {
        e.preventDefault()
        e.stopPropagation()
        setLoading(true)
        try {
            const res = await axios.post(`/wishlist/${productId}/toggle`)
            setInWishlist(res.data.in_wishlist)
            window.dispatchEvent(new CustomEvent('wishlist:updated', { detail: res.data }))
        } catch (err) {
            if (err.response?.status === 401) window.location.href = '/login'
        } finally {
            setLoading(false)
        }
    }

    return (
        <button
            onClick={toggle}
            disabled={loading}
            aria-label={inWishlist ? "Remover dos favoritos" : "Adicionar aos favoritos"}
            className={`text-ink p-1 ${className}`}
        >
            <svg width={size} height={size} viewBox="0 0 24 24"
                fill={inWishlist ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8">
                <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8Z" />
            </svg>
        </button>
    )
}
