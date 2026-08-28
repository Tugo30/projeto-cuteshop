import { createRoot } from 'react-dom/client'
import Navbar from '@/pages/Home/Navbar'
import WishlistPage from '@/pages/Wishlist/WishlistPage'

const el = document.getElementById('wishlist-app')
if (el) {
    createRoot(el).render(
        <>
            <Navbar />
            <WishlistPage />
        </>
    )
}