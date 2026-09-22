import { createRoot } from 'react-dom/client'
import PaymentPage from './pages/Checkout/PaymentPage'

const el = document.getElementById('checkout-payment-app')
if (el) {
    createRoot(el).render(<PaymentPage orderCode={el.dataset.orderCode} />)
}