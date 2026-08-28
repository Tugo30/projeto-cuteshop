import React from "react"
import ReactDOM from "react-dom/client"
import OrdersList from "./pages/Orders/OrdersList"
import "../css/app.css"

const el = document.getElementById("orders-app")
if (el) ReactDOM.createRoot(el).render(<React.StrictMode><OrdersList /></React.StrictMode>)