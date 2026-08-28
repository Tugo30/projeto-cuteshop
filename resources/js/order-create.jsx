import React from "react"
import ReactDOM from "react-dom/client"
import CreateOrder from "./pages/Orders/CreateOrder"
import "../css/app.css"

const el = document.getElementById("order-create-app")
if (el) ReactDOM.createRoot(el).render(<React.StrictMode><CreateOrder /></React.StrictMode>)