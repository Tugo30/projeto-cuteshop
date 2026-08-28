import React from "react"
import ReactDOM from "react-dom/client"
import EditUser from "./pages/Users/EditUser"
import "../css/app.css"

const el = document.getElementById("edit-app")
if (el) {
    ReactDOM.createRoot(el).render(
        <React.StrictMode>
            <EditUser />
        </React.StrictMode>
    )
}