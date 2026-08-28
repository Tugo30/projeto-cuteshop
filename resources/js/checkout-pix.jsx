import { createRoot } from 'react-dom/client'
import PixPayment from '@/pages/Checkout/PixPayment'

const el = document.getElementById('checkout-pix-app')
if (el) {
    createRoot(el).render(<PixPayment orderCode={el.dataset.orderCode} />)
}   