import React from "react"
import ReactDOM from "react-dom/client"
import AdminCoupons from "./pages/Admin/Coupons/AdminCoupons"

const el = document.getElementById("admin-coupons-app")
if (el) ReactDOM.createRoot(el).render(<AdminCoupons />)
