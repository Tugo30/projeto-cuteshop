import { useState } from "react"
import axios from "axios"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function CreateUser() {
  const [form, setForm] = useState({
    role_id: "", name: "", email: "", username: "", password: "", password_confirmation: ""
  })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState("") // ← novo

  const roles = window.roles ?? []

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setErrors({})
    setSuccess("") // ← limpa mensagem anterior

    try {
      await axios.post("/users", form, {
        headers: {
          "X-CSRF-TOKEN": document.querySelector('meta[name="csrf-token"]').content
        }
      })

      setSuccess("Usuário criado com sucesso!") // ← exibe mensagem
      setForm({ role_id: "", name: "", email: "", username: "", password: "", password_confirmation: "" }) // ← limpa formulário
      setTimeout(() => setSuccess(""), 4000) // ← some após 4 segundos

    } catch (err) {
      if (err.response?.status === 422) {
        setErrors(err.response.data.errors)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-xl mx-auto mt-10">
      <Card>
        <CardHeader>
          <CardTitle>Criar Usuário</CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">

          {/* ← mensagem de sucesso */}
          {success && (
            <div className="bg-green-100 text-green-800 border border-green-300 rounded px-4 py-2 text-sm">
              {success}
            </div>
          )}

          <div>
            <Label>Função</Label>
            <select name="role_id" onChange={handleChange} value={form.role_id} className="w-full border rounded px-3 py-2">
              <option value="">Selecione</option>
              {roles.map(role => (
                <option key={role.id} value={role.id}>{role.nome}</option>
              ))}
            </select>
            {errors.role_id && <p className="text-red-500 text-sm">{errors.role_id[0]}</p>}
          </div>

          <div>
            <Label>Nome</Label>
            <Input name="name" placeholder="Nome" onChange={handleChange} value={form.name} />
            {errors.name && <p className="text-red-500 text-sm">{errors.name[0]}</p>}
          </div>

          <div>
            <Label>Email</Label>
            <Input name="email" type="email" placeholder="email@empresa.com" onChange={handleChange} value={form.email} />
            {errors.email && <p className="text-red-500 text-sm">{errors.email[0]}</p>}
          </div>

          <div>
            <Label>Usuário</Label>
            <Input name="username" placeholder="username" onChange={handleChange} value={form.username} />
            {errors.username && <p className="text-red-500 text-sm">{errors.username[0]}</p>}
          </div>

          <div>
            <Label>Senha</Label>
            <Input name="password" type="password" onChange={handleChange} value={form.password} />
            {errors.password && <p className="text-red-500 text-sm">{errors.password[0]}</p>}
          </div>

          <div>
            <Label>Confirmar Senha</Label>
            <Input name="password_confirmation" type="password" onChange={handleChange} value={form.password_confirmation} />
          </div>

          <Button className="w-full text-white" onClick={handleSubmit} disabled={loading}>
            {loading ? "Salvando..." : "Criar Usuário"}
          </Button>

        </CardContent>
      </Card>
    </div>
  )
}