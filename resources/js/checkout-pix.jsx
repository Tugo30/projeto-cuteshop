import { createRoot } from 'react-dom/client'
import PaymentPage from '@/pages/Checkout/PaymentPage'
import Navbar from '@/pages/Home/Navbar'

const el = document.getElementById('checkout-pix-app')
if (el) {
    createRoot(el).render(
        <>
            <Navbar />
            <PaymentPage orderCode={el.dataset.orderCode} />
        </>
    )
}