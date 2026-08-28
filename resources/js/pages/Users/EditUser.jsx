import { useState, useEffect } from "react"
import axios from "axios"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import UserForm from "@/components/UserForm"

const csrf = () => document.querySelector('meta[name="csrf-token"]').content

export default function EditUser() {
  const userId = window.editUserId // passado pelo blade

  const [form, setForm] = useState({
    role_id: "", name: "", email: "", username: "", password: "", password_confirmation: ""
  })
  const [errors, setErrors]   = useState({})
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState("")
  const [fetching, setFetching] = useState(true)

  useEffect(() => {
    axios.get(`/users/${userId}/edit-data`)
      .then(res => {
        const u = res.data
        setForm({
          role_id: u.role_id ?? "",
          name: u.name ?? "",
          email: u.email ?? "",
          username: u.username ?? "",
          password: "",
          password_confirmation: ""
        })
      })
      .catch(() => alert("Erro ao carregar dados do usuário."))
      .finally(() => setFetching(false))
  }, [])

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setErrors({})
    setSuccess("")

    try {
      await axios.put(`/users/${userId}`, form, {
        headers: { "X-CSRF-TOKEN": csrf() }
      })

      setSuccess("Usuário atualizado com sucesso!")
      setTimeout(() => setSuccess(""), 4000)

    } catch (err) {
      if (err.response?.status === 422) {
        setErrors(err.response.data.errors)
      }
    } finally {
      setLoading(false)
    }
  }

  if (fetching) return (
    <div style={{ textAlign: "center", padding: "60px", color: "#888", fontFamily: "DM Sans, sans-serif" }}>
      Carregando...
    </div>
  )

  return (
    <div className="max-w-xl mx-auto mt-10">
      <Card>
        <CardHeader>
          <CardTitle>Editar Usuário</CardTitle>
        </CardHeader>
        <CardContent>
          <UserForm
            form={form}
            errors={errors}
            loading={loading}
            success={success}
            onChange={handleChange}
            onSubmit={handleSubmit}
            isEdit={true}
          />
        </CardContent>
      </Card>
    </div>
  )
}