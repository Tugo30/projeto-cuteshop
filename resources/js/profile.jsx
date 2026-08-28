import React from "react"
import ReactDOM from "react-dom/client"
import UserProfile from "./pages/Profile/UserProfile"
import "../css/app.css"

const el = document.getElementById("profile-app")
if (el) ReactDOM.createRoot(el).render(<React.StrictMode><UserProfile /></React.StrictMode>)