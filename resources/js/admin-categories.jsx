import React from "react"
import ReactDOM from "react-dom/client" // Importa o ReactDOM completo
import CategoriesAdmin from "./pages/Admin/Categories/CategoriesAdmin"
import "../css/app.css"

const el = document.getElementById("admin-categories-app")

if (el) {
    // ReactDOM.createRoot em vez de apenas createRoot
    ReactDOM.createRoot(el).render(
        <React.StrictMode>
            <CategoriesAdmin />
        </React.StrictMode>
    )
} else {
    console.error("ERRO: Elemento #admin-categories-app NÃO encontrado na página.")
}