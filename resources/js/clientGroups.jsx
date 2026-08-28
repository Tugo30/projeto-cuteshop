import React from "react"
import ReactDOM from "react-dom/client"
import ClientGroupsList from "./pages/ClientGroups/ClientGroupsList"
import "../css/app.css"

const el = document.getElementById("client-groups-app")
if (el) ReactDOM.createRoot(el).render(<React.StrictMode><ClientGroupsList /></React.StrictMode>)