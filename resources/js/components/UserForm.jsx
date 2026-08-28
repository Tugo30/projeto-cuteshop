import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function UserForm({ form, errors, loading, success, onChange, onSubmit, isEdit = false }) {
  const roles = window.roles ?? []

  return (
    <div className="space-y-4">

      {success && (
        <div className="bg-green-100 text-green-800 border border-green-300 rounded px-4 py-2 text-sm">
          {success}
        </div>
      )}

      <div>
        <Label>Função</Label>
        <select name="role_id" onChange={onChange} value={form.role_id} className="w-full border rounded px-3 py-2">
          <option value="">Selecione</option>
          {roles.map(role => (
            <option key={role.id} value={role.id}>{role.nome}</option>
          ))}
        </select>
        {errors.role_id && <p className="text-red-500 text-sm">{errors.role_id[0]}</p>}
      </div>

      <div>
        <Label>Nome</Label>
        <Input name="name" placeholder="Nome" onChange={onChange} value={form.name} />
        {errors.name && <p className="text-red-500 text-sm">{errors.name[0]}</p>}
      </div>

      <div>
        <Label>Email</Label>
        <Input name="email" type="email" placeholder="email@empresa.com" onChange={onChange} value={form.email} />
        {errors.email && <p className="text-red-500 text-sm">{errors.email[0]}</p>}
      </div>

      <div>
        <Label>Usuário</Label>
        <Input name="username" placeholder="username" onChange={onChange} value={form.username} />
        {errors.username && <p className="text-red-500 text-sm">{errors.username[0]}</p>}
      </div>

      <div>
        <Label>{isEdit ? "Nova Senha" : "Senha"} {isEdit && <span className="text-gray-400 text-xs">(deixe em branco para não alterar)</span>}</Label>
        <Input name="password" type="password" onChange={onChange} value={form.password} />
        {errors.password && <p className="text-red-500 text-sm">{errors.password[0]}</p>}
      </div>

      <div>
        <Label>Confirmar Senha</Label>
        <Input name="password_confirmation" type="password" onChange={onChange} value={form.password_confirmation} />
      </div>

      <Button className="w-full text-white" onClick={onSubmit} disabled={loading}>
        {loading ? "Salvando..." : isEdit ? "Salvar Alterações" : "Criar Usuário"}
      </Button>

    </div>
  )
}