import React from "react"
import ReactDOM from "react-dom/client"
import ClientsList from "./pages/Clients/ClientsList"
import "../css/app.css"

const el = document.getElementById("clients-app")
if (el) ReactDOM.createRoot(el).render(<React.StrictMode><ClientsList /></React.StrictMode>)