import React from "react"
import ReactDOM from "react-dom/client"
import ProductDetail from "./pages/Product/ProductDetail"
import "../css/app.css"

const el = document.getElementById("product-app")
if (el) {
    const productId = el.dataset.productId
    ReactDOM.createRoot(el).render(
        <React.StrictMode>
            <ProductDetail productId={productId} />
        </React.StrictMode>
    )
}