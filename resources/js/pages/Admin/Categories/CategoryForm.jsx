import { useState } from "react"
import axios from "axios"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const csrf = () => document.querySelector('meta[name="csrf-token"]')?.content

export default function CategoryForm({ category = null, onSaved, onCancel }) {
    const isEditing = Boolean(category);
    const [name, setName] = useState(category?.name ?? "");
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState("");

    async function handleSubmit(e) {
        e.preventDefault();
        setSaving(true);
        setError("");

        try {
            if (isEditing) {
                await axios.put(`/api/admin/categorias/${category.id}`, { name }, {
                    headers: { "X-CSRF-TOKEN": csrf() }
                })
            } else {
                await axios.post("/api/admin/categorias", { name }, {
                    headers: { "X-CSRF-TOKEN": csrf() }
                })
            }
            onSaved?.()
        } catch (err) {
            setError(err.response?.data?.message ?? "Erro ao salvar categoria.")
        } finally {
            setSaving(false)
        }
    }

    return (
        <Card>
            <CardHeader>
                 <CardTitle className="text-base">{isEditing ? "Editar Categoria" : "Nova Categoria"}</CardTitle>
            </CardHeader>
            <CardContent>
                {error && (
                    <div className="bg-red-100 text-red-800 border border-red-300 rounded px-4 py-2 text-sm mb-4">
                        {error}
                    </div>
                )}
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <div>
                        <Label>Nome da Categoria</Label>
                        <Input value={name} onChange={e => setName(e.target.value)} required/>
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
                        <Button type="submit" disabled={saving} className="bg-black hover:bg-neutral-800 text-white">
                            {saving ? "Salvando.." : "Salvar"}
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    )
}