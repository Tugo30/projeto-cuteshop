import axios from "axios"
window.axios = axios
window.axios.defaults.headers.common["X-Requested-With"] = "XMLHttpRequest"
const t = document.querySelector('meta[name="csrf-token"]')?.content
if (t) window.axios.defaults.headers.common["X-CSRF-TOKEN"] = t
