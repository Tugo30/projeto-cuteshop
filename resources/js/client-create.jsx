import React from "react"
import ReactDOM from "react-dom/client"
import CreateClient from "./pages/Clients/CreateClient"
import "../css/app.css"

const el = document.getElementById("client-create-app")
if (el) ReactDOM.createRoot(el).render(<React.StrictMode><CreateClient /></React.StrictMode>)