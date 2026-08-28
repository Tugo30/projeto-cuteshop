import React from "react"
import ReactDOM from "react-dom/client"
import EditClient from "./pages/Clients/EditClient"
import "../css/app.css"

const el = document.getElementById("client-edit-app")
if (el) ReactDOM.createRoot(el).render(<React.StrictMode><EditClient /></React.StrictMode>)