import React from "react"
import ReactDOM from "react-dom/client"
import AdminDashboard from "./pages/Admin/Dashboard/AdminDashboard"
import "../css/app.css"

const el = document.getElementById("admin-dashboard-app")

if(el){
    ReactDOM.createRoot(el).render(
        <React.StrictMode>
            <AdminDashboard />
        </React.StrictMode>
    )
} else{
    console.log("ERRO: Elemento #admin-dashboard-app NÃO encontrado na página.")
}