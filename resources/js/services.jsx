import React from "react"
import ReactDOM from "react-dom/client"
import ServicesList from "./pages/Services/ServicesList"
import "../css/app.css"

const el = document.getElementById("services-app")
if (el) ReactDOM.createRoot(el).render(<React.StrictMode><ServicesList /></React.StrictMode>)