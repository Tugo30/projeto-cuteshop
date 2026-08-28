import { createRoot } from 'react-dom/client'
import Navbar from '@/pages/Home/Navbar'
import CartPage from '@/pages/Cart/CartPage'

const el = document.getElementById('cart-app')
if (el) {
    createRoot(el).render(
        <>
            <Navbar />
            <CartPage />
        </>
    )
}