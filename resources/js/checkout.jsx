import { createRoot } from 'react-dom/client'
import Navbar from '@/pages/Home/Navbar'
import CheckoutPage from '@/pages/Checkout/CheckoutPage'

const el = document.getElementById('checkout-app')
if (el) {
    createRoot(el).render(
        <>
            <Navbar />
            <CheckoutPage />
        </>
    )
}