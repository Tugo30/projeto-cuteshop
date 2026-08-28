import React from "react"
import ReactDOM from "react-dom/client"
import PaymentMethodsList from "./pages/PaymentMethods/PaymentMethodsList"
import "../css/app.css"

const el = document.getElementById("payment-app")
if (el) {
    ReactDOM.createRoot(el).render(
        <React.StrictMode>
            <PaymentMethodsList />
        </React.StrictMode>
    )
}