import React from "react"
import ReactDOM from "react-dom/client"
import ProductsAdmin from "./pages/Admin/Products/ProductsAdmin"
import "../css/app.css"

const el = document.getElementById("admin-products-app")

if (el) {
    ReactDOM.createRoot(el).render(
        <React.StrictMode>
            <ProductsAdmin />
        </React.StrictMode>
    )
} else {
    console.error("ERRO: Elemento #admin-categories-app NÃO encontrado na página.")
}