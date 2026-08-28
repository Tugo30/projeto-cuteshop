import React from "react"
import ReactDOM from "react-dom/client"
import CreateUser from "./pages/Users/CreateUser"
import "../css/app.css"

// Garante que o código só rode se o elemento existir na página
const rootElement = document.getElementById("app");

if (rootElement) {
    ReactDOM.createRoot(rootElement).render(
        <React.StrictMode>
            <CreateUser />
        </React.StrictMode>
    )
}