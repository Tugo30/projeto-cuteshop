import React from "react"
import ReactDOM from "react-dom/client"
import Login from "./pages/Auth/Login"
import "../css/app.css"

const el = document.getElementById("login-app")
if (el) ReactDOM.createRoot(el).render(<React.StrictMode><Login /></React.StrictMode>)