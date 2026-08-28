import React from "react"
import ReactDOM from "react-dom/client"
import AdminOrdersList from "./pages/Admin/Orders/AdminOrdersList"

const el = document.getElementById("admin-orders-app")

if(el){
    ReactDOM.createRoot(a).render(
        <React.StrictMode>
            <AdminOrdersList />
        </React.StrictMode>
    )
} else {
    console.error("ERRO: Elemento #admin-orders-app NÃO encontrado na página.")
}