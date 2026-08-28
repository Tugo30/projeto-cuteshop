import { useState, useEffect } from "react"
import axios from "axios"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select"
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table"

const csrf = () => document.querySelector('meta[name="csrf-token"]')?.content

const emptyVariant = { size: "", stock: 0, cost_price: "", price: "", barcode: "" }
const emptySpec = { label: "", value: "" }

// Presets — o admin só preenche os valores
const SPEC_PRESETS = [
    { label: "Material", value: "" },
    { label: "Composição", value: "" },
    { label: "Modelagem", value: "" },
    { label: "Garantia", value: "" },
]

export default function ProductForm({ product = null, onSaved, onCancel }) {
    const isEditing = Boolean(product)

    const [categories, setCategories] = useState([])
    const [saving, setSaving] = useState(false)
    const [formError, setFormError] = useState("")
    const [errors, setErrors] = useState({})   // erros 422 campo a campo

    const [name, setName] = useState(product?.name ?? "")
    const [categoryId, setCategoryId] = useState(
        product?.category_id ? String(product.category_id) : ""
    )
    const [description, setDescription] = useState(product?.description ?? "")
    const [imageFiles, setImageFiles] = useState([])
    const [imagePreviews, setImagePreviews] = useState(
        product?.images?.map(img => img.url) ?? []
    )

    function handleImageChange(e) {
        const files = Array.from(e.target.files)
        setImageFiles(files)
        setImagePreviews(files.map(f => URL.createObjectURL(f)))
    }

    const [variants, setVariants] = useState(
        product?.variants?.length
            ? product.variants.map(v => ({
                size: v.size,
                stock: v.stock,
                cost_price: v.cost_price ?? "",
                price: v.price,
                barcode: v.barcode ?? "",
            }))
            : [{ ...emptyVariant, size: "38", stock: 1 }]
    )

    const [specs, setSpecs] = useState(
        product?.specifications?.length
            ? product.specifications.map(s => ({ label: s.label, value: s.value }))
            : [{ ...emptySpec }]
    )

    useEffect(() => {
        axios.get("/api/admin/categorias")
            .then(res => setCategories(res.data))
            .catch(err => console.error("Erro ao carregar categorias:", err))
    }, [])

    /* ---------- Variações ---------- */
    const addVariant = () => setVariants([...variants, { ...emptyVariant }])
    const removeVariant = i => setVariants(variants.filter((_, idx) => idx !== i))
    const changeVariant = (i, field, val) =>
        setVariants(variants.map((v, idx) => (idx === i ? { ...v, [field]: val } : v)))

    /* ---------- Ficha Técnica ---------- */
    const addSpec = () => setSpecs([...specs, { ...emptySpec }])
    const removeSpec = i => setSpecs(specs.filter((_, idx) => idx !== i))
    const changeSpec = (i, field, val) =>
        setSpecs(specs.map((s, idx) => (idx === i ? { ...s, [field]: val } : s)))
    const applyPresets = () => {
        const existing = specs.filter(s => s.label.trim() || s.value.trim())
        setSpecs([...existing, ...SPEC_PRESETS])
    }

    /* ---------- Submit ---------- */
    async function handleSubmit(e) {
        e.preventDefault()
        setErrors({})
        setFormError("")

        if (!name.trim()) { setFormError("O nome do produto é obrigatório."); return }
        if (!categoryId) { setFormError("Selecione uma categoria."); return }

        setSaving(true)

        const fd = new FormData()
        fd.append("name", name)
        fd.append("category_id", categoryId)
        fd.append("description", description ?? "")

        variants.forEach((v, i) => {
            fd.append(`variants[${i}][size]`, v.size)
            fd.append(`variants[${i}][stock]`, Number(v.stock) || 0)
            fd.append(`variants[${i}][price]`, Number(v.price))
            if (v.cost_price !== "") fd.append(`variants[${i}][cost_price]`, Number(v.cost_price))
            if (v.barcode !== "") fd.append(`variants[${i}][barcode]`, v.barcode)
        })

        specs.filter(s => s.label.trim() && s.value.trim()).forEach((s, i) => {
            fd.append(`specifications[${i}][label]`, s.label)
            fd.append(`specifications[${i}][value]`, s.value)
        })

        imageFiles.forEach((file, i) => fd.append(`images[${i}]`, file))

        if (isEditing) fd.append("_method", "PUT") // Laravel: multipart não suporta PUT nativo

        const config = { headers: { "X-CSRF-TOKEN": csrf(), "Content-Type": "multipart/form-data" } }

        try {
            const url = isEditing ? `/api/admin/produtos/${product.id}` : "/api/admin/produtos"
            await axios.post(url, fd, config) // sempre POST — o _method resolve o PUT no backend
            onSaved?.()
        } catch (err) {
            if (err.response?.status === 422) {
                setErrors(err.response.data.errors ?? {})
                setFormError("Corrija os campos destacados abaixo.")
            } else {
                setFormError(err.response?.data?.message ?? "Erro ao salvar produto. Tente novamente.")
            }
        } finally {
            setSaving(false)
        }
    }

    const fieldError = key => errors[key]?.[0]

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base">
                    {isEditing ? "Editar Produto" : "Novo Produto"}
                </CardTitle>
            </CardHeader>

            <CardContent>
                {formError && (
                    <div className="bg-red-100 text-red-800 border border-red-300 rounded px-4 py-2 text-sm mb-4">
                        {formError}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    {/* Nome */}
                    <div>
                        <Label>Nome do Produto</Label>
                        <Input
                            placeholder="Ex: Sandália Salto Bloco Caramelo"
                            value={name}
                            onChange={e => setName(e.target.value)}
                        />
                        {fieldError("name") && (
                            <p className="text-xs text-red-600 mt-1">{fieldError("name")}</p>
                        )}
                    </div>

                    {/* Categoria + Imagem */}
                    <div className="grid grid-cols-3 gap-3">
                        <div>
                            <Label>Categoria</Label>
                            <Select value={categoryId} onValueChange={setCategoryId}>
                                <SelectTrigger className="w-full bg-white border border-input rounded-md h-10 px-3 py-2 text-sm">
                                    <SelectValue placeholder="Selecione..." />
                                </SelectTrigger>
                                <SelectContent className="bg-white border rounded-md shadow-md z-50">
                                    {categories.map(cat => (
                                        <SelectItem key={cat.id} value={String(cat.id)}>
                                            {cat.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {fieldError("category_id") && (
                                <p className="text-xs text-red-600 mt-1">{fieldError("category_id")}</p>
                            )}
                        </div>

                        <div className="col-span-2">
                            <Label>Fotos do Produto (até 6)</Label>
                            <Input
                                type="file"
                                accept="image/png, image/jpeg, image/webp"
                                multiple
                                onChange={handleImageChange}
                            />
                            <div className="flex gap-2 mt-2 flex-wrap">
                                {imagePreviews.map((src, i) => (
                                    <img key={i} src={src} className="w-16 h-16 object-cover rounded border" />
                                ))}
                            </div>
                            {fieldError("images") && (
                                <p className="text-xs text-red-600 mt-1">{fieldError("images")}</p>
                            )}
                        </div>
                    </div>

                    {/* Descrição */}
                    <div>
                        <Label>Descrição</Label>
                        <Textarea
                            rows={3}
                            placeholder="Descrição comercial do produto..."
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                        />
                    </div>

                    <hr className="border-t border-neutral-200 my-1" />

                    {/* Variações */}
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold">Variações de Estoque e Tamanho</h3>
                        <Button type="button" onClick={addVariant} variant="outline" size="sm">
                            + Tamanho
                        </Button>
                    </div>

                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Tamanho</TableHead>
                                    <TableHead>Estoque</TableHead>
                                    <TableHead>Custo (R$)</TableHead>
                                    <TableHead>Venda (R$)</TableHead>
                                    <TableHead>Cód. Barras</TableHead>
                                    <TableHead className="w-10" />
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {variants.map((v, i) => (
                                    <TableRow key={i}>
                                        <TableCell>
                                            <Input className="h-8" placeholder="38/M" value={v.size}
                                                onChange={e => changeVariant(i, "size", e.target.value)} />
                                            {fieldError(`variants.${i}.size`) && (
                                                <p className="text-[10px] text-red-600">{fieldError(`variants.${i}.size`)}</p>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Input className="h-8" type="number" min="0" value={v.stock}
                                                onChange={e => changeVariant(i, "stock", e.target.value)} />
                                        </TableCell>
                                        <TableCell>
                                            <Input className="h-8" placeholder="34.00" value={v.cost_price}
                                                onChange={e => changeVariant(i, "cost_price", e.target.value)} />
                                        </TableCell>
                                        <TableCell>
                                            <Input className="h-8" placeholder="280.00" value={v.price}
                                                onChange={e => changeVariant(i, "price", e.target.value)} />
                                            {fieldError(`variants.${i}.price`) && (
                                                <p className="text-[10px] text-red-600">{fieldError(`variants.${i}.price`)}</p>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Input className="h-8" placeholder="9200000001234" value={v.barcode}
                                                onChange={e => changeVariant(i, "barcode", e.target.value)} />
                                        </TableCell>
                                        <TableCell>
                                            {variants.length > 1 && (
                                                <Button type="button" variant="ghost" size="icon"
                                                    onClick={() => removeVariant(i)}>
                                                    <i className="fas fa-trash text-red-600" />
                                                </Button>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>

                    <hr className="border-t border-neutral-200 my-1" />

                    {/* FICHA TÉCNICA */}
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold">Ficha Técnica</h3>
                        <div className="flex gap-2">
                            <Button type="button" onClick={applyPresets} variant="ghost" size="sm">
                                Usar modelo
                            </Button>
                            <Button type="button" onClick={addSpec} variant="outline" size="sm">
                                + Especificação
                            </Button>
                        </div>
                    </div>

                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[35%]">Característica</TableHead>
                                    <TableHead>Descrição</TableHead>
                                    <TableHead className="w-10" />
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {specs.map((s, i) => (
                                    <TableRow key={i}>
                                        <TableCell>
                                            <Input className="h-8" placeholder="Material" value={s.label}
                                                onChange={e => changeSpec(i, "label", e.target.value)} />
                                        </TableCell>
                                        <TableCell>
                                            <Input className="h-8" placeholder="Couro sintético" value={s.value}
                                                onChange={e => changeSpec(i, "value", e.target.value)} />
                                        </TableCell>
                                        <TableCell>
                                            {specs.length > 1 && (
                                                <Button type="button" variant="ghost" size="icon"
                                                    onClick={() => removeSpec(i)}>
                                                    <i className="fas fa-trash text-red-600" />
                                                </Button>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                    <p className="text-xs text-neutral-400 -mt-2">
                        Linhas em branco são ignoradas automaticamente ao salvar.
                    </p>

                    {/* Ações */}
                    <div className="flex justify-end gap-2 mt-2">
                        <Button type="button" variant="outline" onClick={onCancel}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={saving}
                            className="bg-black hover:bg-neutral-800 text-white">
                            {saving ? "Salvando..." : isEditing ? "Salvar Alterações" : "Salvar Produto"}
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    )
}