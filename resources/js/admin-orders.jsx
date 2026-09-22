import React from "react"
import ReactDOM from "react-dom/client"
import AdminOrdersList from "./pages/Admin/Orders/AdminOrdersList"

const el = document.getElementById("admin-orders-app")
if (el) ReactDOM.createRoot(el).render(<AdminOrdersList />)
