import React from "react"
import ReactDOM from "react-dom/client"
import CategoriesList from "./pages/Admin/Categories/CategoryList"
import "../css/app.css"

const el = document.getElementById("categories-app")
if (el) ReactDOM.createRoot(el).render(<React.StrictMode><CategoriesList /></React.StrictMode>)