import React from "react"
import ReactDOM from "react-dom/client"
import ClientProfile from "./pages/Clients/ClientProfile"
import "../css/app.css"

const el = document.getElementById("client-profile-app")
if (el) ReactDOM.createRoot(el).render(<React.StrictMode><ClientProfile /></React.StrictMode>)