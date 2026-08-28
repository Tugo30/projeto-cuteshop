import React from "react"
import ReactDOM from "react-dom/client"
import UsersList from "./pages/Users/UsersList"
import "../css/app.css"

const el = document.getElementById("users-app")
if (el) {
    ReactDOM.createRoot(el).render(
        <React.StrictMode>
            <UsersList />
        </React.StrictMode>
    )
}