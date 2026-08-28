import React from "react"
import ReactDOM from "react-dom/client"
import Home from "./pages/Home/Home"
import "../css/app.css"

const el = document.getElementById("storefront-app")

if (el) {
    ReactDOM.createRoot(el).render(
        <React.StrictMode>
            <Home />
        </React.StrictMode>
    )
}