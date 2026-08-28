import React from "react"
import ReactDOM from "react-dom/client"
import OrdersByClient from "./pages/Orders/OrdersByClient"
import "../css/app.css"

const el = document.getElementById("orders-by-client-app")
if (el) ReactDOM.createRoot(el).render(<React.StrictMode><OrdersByClient /></React.StrictMode>)