import React from "react"
import ReactDOM from "react-dom/client"
import MyOrders from "./pages/Orders/MyOrders"

const el = document.getElementById("orders-app")
if (el) {
    ReactDOM.createRoot(el).render(<MyOrders />)
}
