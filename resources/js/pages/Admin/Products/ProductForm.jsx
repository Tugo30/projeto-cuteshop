import { useState, useEffect, useMemo, useRef } from "react"
import axios from "axios"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Trash2, Plus, Star, ImageIcon } from "lucide-react"

const getCsrfToken = () => document.querySelector('meta[name="csrf-token"]')?.content

const MAX_IMAGES = 6

const emptyVariant = {
    size: "",
    stock: 0,
    cost_price: "",
    price: "",
    barcode: "",
}

const emptySpec = {
    label: "",
    value: "",
}

const SPEC_PRESETS = [
    { label: "Material", value: "" },
    { label: "Composição", value: "" },
    { label: "Modelagem", value: "" },
    { label: "Garantia", value: "" },
]

export default function ProductForm({ product = null, onSaved, onCancel }) {
    const isEditing = Boolean(product)
    const isMounted = useRef(true)

    const [categories, setCategories] = useState([])
    const [saving, setSaving] = useState(false)
    const [errors, setErrors] = useState({})

    const [name, setName] = useState(product?.name ?? "")
    const [categoryId, setCategoryId] = useState(
        product?.category_id ? String(product.category_id) : ""
    )
    const [description, setDescription] = useState(product?.description ?? "")

    const [existingImages, setExistingImages] = useState(product?.images ?? [])
    const [removedIds, setRemovedIds] = useState([])
    const [newFiles, setNewFiles] = useState([])
    const [coverImageId, setCoverImageId] = useState(null)

    useEffect(() => {
        isMounted.current = true
        return () => {
            isMounted.current = false
        }
    }, [])

    const visibleExisting = useMemo(
        () => existingImages.filter((img) => !removedIds.includes(img.id)),
        [existingImages, removedIds]
    )

    const newPreviews = useMemo(() => {
        return newFiles.map((file) => ({
            file,
            url: URL.createObjectURL(file),
        }))
    }, [newFiles])

    useEffect(() => {
        return () => {
            newPreviews.forEach((item) => URL.revokeObjectURL(item.url))
        }
    }, [newPreviews])

    const totalImages = visibleExisting.length + newFiles.length
    const currentCoverId =
        coverImageId ?? visibleExisting.find((img) => img.is_cover)?.id ?? null

    function handleImageChange(e) {
        const files = Array.from(e.target.files)
        const remainingSlots = MAX_IMAGES - totalImages

        if (remainingSlots <= 0) {
            setErrors((prev) => ({
                ...prev,
                images: [`Você já atingiu o limite de ${MAX_IMAGES} fotos.`],
            }))
            e.target.value = ""
            return
        }

        setNewFiles((prev) => [...prev, ...files.slice(0, remainingSlots)])
        setErrors((prev) => ({ ...prev, images: undefined }))
        e.target.value = ""
    }

    function removeNewFile(index) {
        setNewFiles((prev) => prev.filter((_, i) => i !== index))
    }

    function removeExistingImage(image) {
        setRemovedIds((prev) => [...prev, image.id])
        if (coverImageId === image.id) {
            setCoverImageId(null)
        }
    }

    function setAsCover(image) {
        setCoverImageId(image.id)
    }

    const [variants, setVariants] = useState(
        product?.variants?.length
            ? product.variants.map((v) => ({
                  size: v.size ?? "",
                  stock: v.stock ?? 0,
                  cost_price: v.cost_price ?? "",
                  price: v.price ?? "",
                  barcode: v.barcode ?? "",
              }))
            : [{ ...emptyVariant, size: "38", stock: 1 }]
    )

    const [specs, setSpecs] = useState(
        product?.specifications?.length
            ? product.specifications.map((s) => ({
                  label: s.label ?? "",
                  value: s.value ?? "",
              }))
            : [{ ...emptySpec }]
    )

    useEffect(() => {
        const controller = new AbortController()
        axios
            .get("/api/admin/categorias", { signal: controller.signal })
            .then((res) => {
                if (isMounted.current) setCategories(res.data)
            })
            .catch((err) => {
                if (!axios.isCancel(err)) {
                    console.error("Erro ao carregar categorias:", err)
                }
            })

        return () => controller.abort()
    }, [])

    const addVariant = () => setVariants((prev) => [...prev, { ...emptyVariant }])
    const removeVariant = (i) =>
        setVariants((prev) => prev.filter((_, idx) => idx !== i))
    const changeVariant = (i, field, val) =>
        setVariants((prev) =>
            prev.map((v, idx) => (idx === i ? { ...v, [field]: val } : v))
        )

    const addSpec = () => setSpecs((prev) => [...prev, { ...emptySpec }])
    const removeSpec = (i) => setSpecs((prev) => prev.filter((_, idx) => idx !== i))
    const changeSpec = (i, field, val) =>
        setSpecs((prev) =>
            prev.map((s, idx) => (idx === i ? { ...s, [field]: val } : s))
        )

    const applyPresets = () => {
        const existing = specs.filter((s) => s.label.trim() || s.value.trim())
        setSpecs([...existing, ...SPEC_PRESETS])
    }

    async function handleSubmit(e) {
        e.preventDefault()
        setErrors({})
        setSaving(true)

        const fd = new FormData()
        fd.append("name", name)
        fd.append("category_id", categoryId)
        fd.append("description", description ?? "")

        variants.forEach((v, i) => {
            fd.append(`variants[${i}][size]`, v.size)
            fd.append(`variants[${i}][stock]`, v.stock === "" ? 0 : Number(v.stock))
            if (v.price !== "") {
                fd.append(`variants[${i}][price]`, Number(v.price))
            }
            if (v.cost_price !== "") {
                fd.append(`variants[${i}][cost_price]`, Number(v.cost_price))
            }
            if (v.barcode !== "") {
                fd.append(`variants[${i}][barcode]`, v.barcode)
            }
        })

        specs
            .filter((s) => s.label.trim() && s.value.trim())
            .forEach((s, i) => {
                fd.append(`specifications[${i}][label]`, s.label)
                fd.append(`specifications[${i}][value]`, s.value)
            })

        newFiles.forEach((file, i) => fd.append(`images[${i}]`, file))

        if (isEditing) {
            fd.append("_method", "PUT")
            removedIds.forEach((id, i) => fd.append(`removed_image_ids[${i}]`, id))
            if (coverImageId) {
                fd.append("cover_image_id", coverImageId)
            }
        }

        const config = {
            headers: { "X-CSRF-TOKEN": getCsrfToken() },
        }

        try {
            const url = isEditing
                ? `/api/admin/produtos/${product.id}`
                : "/api/admin/produtos"

            await axios.post(url, fd, config)
            if (isMounted.current) onSaved?.()
        } catch (err) {
            if (!isMounted.current) return
            if (err.response?.status === 422) {
                setErrors(err.response.data.errors ?? {})
            } else {
                setErrors({
                    _global: [
                        err.response?.data?.message ??
                            "Erro ao salvar. Tente novamente.",
                    ],
                })
            }
        } finally {
            if (isMounted.current) setSaving(false)
        }
    }

    const fieldError = (key) => errors[key]?.[0]
    const globalError = errors._global?.[0]

    return (
        <div className="space-y-6 max-w-5xl">
            <div>
                <h1 className="text-2xl font-bold text-ink">
                    {isEditing ? "Editar Produto" : "Novo Produto"}
                </h1>
                <p className="text-sm text-gray-500 mt-1">
                    {isEditing
                        ? "Atualize os dados do seu produto"
                        : "Cadastre um novo produto na loja"}
                </p>
            </div>

            {globalError && (
                <div className="bg-red-50 border border-red-300 rounded-lg px-4 py-3 text-sm text-red-700">
                    {globalError}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* ========== INFORMAÇÕES BÁSICAS ========== */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Informações Básicas</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <Label htmlFor="name" className="font-medium">
                                Nome do Produto <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                id="name"
                                placeholder="Ex: Sandália Salto Bloco Caramelo"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className={`mt-2 ${fieldError("name") ? "border-red-500" : ""}`}
                            />
                            {fieldError("name") && (
                                <p className="text-xs text-red-600 mt-1">{fieldError("name")}</p>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="category" className="font-medium">
                                    Categoria <span className="text-red-500">*</span>
                                </Label>
                                <Select value={categoryId} onValueChange={setCategoryId}>
                                    <SelectTrigger
                                        id="category"
                                        className={`mt-2 ${fieldError("category_id") ? "border-red-500" : ""}`}
                                    >
                                        <SelectValue placeholder="Selecione uma categoria..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {categories.map((cat) => (
                                            <SelectItem key={cat.id} value={String(cat.id)}>
                                                {cat.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {fieldError("category_id") && (
                                    <p className="text-xs text-red-600 mt-1">
                                        {fieldError("category_id")}
                                    </p>
                                )}
                            </div>

                            <div>
                                <Label htmlFor="images" className="font-medium">
                                    Fotos do Produto{" "}
                                    <span className="text-gray-400 font-normal">
                                        ({totalImages}/{MAX_IMAGES})
                                    </span>
                                </Label>
                                <Input
                                    id="images"
                                    type="file"
                                    accept="image/png, image/jpeg, image/webp"
                                    multiple
                                    disabled={totalImages >= MAX_IMAGES}
                                    onChange={handleImageChange}
                                    className={`mt-2 ${fieldError("images") ? "border-red-500" : ""}`}
                                />
                                {fieldError("images") && (
                                    <p className="text-xs text-red-600 mt-1">
                                        {fieldError("images")}
                                    </p>
                                )}
                            </div>
                        </div>

                        {(visibleExisting.length > 0 || newFiles.length > 0) && (
                            <div>
                                <p className="text-xs font-medium text-gray-600 mb-2">
                                    Fotos do produto{" "}
                                    <span className="font-normal text-gray-400">
                                        — clique na estrela para definir a capa
                                    </span>
                                </p>
                                <div className="flex gap-3 flex-wrap">
                                    {visibleExisting.map((img) => {
                                        const isCover = currentCoverId === img.id
                                        return (
                                            <div key={`existing-${img.id}`} className="relative">
                                                <div
                                                    className={`w-20 h-20 rounded border overflow-hidden ${
                                                        isCover ? "border-2 border-amber-400" : "border-border"
                                                    }`}
                                                >
                                                    <img
                                                        src={img.url}
                                                        alt="Foto do produto"
                                                        className="w-full h-full object-cover"
                                                    />
                                                </div>

                                                <button
                                                    type="button"
                                                    onClick={() => setAsCover(img)}
                                                    title={isCover ? "Foto principal" : "Definir como capa"}
                                                    className={`absolute -top-1.5 -left-1.5 flex h-5 w-5 items-center justify-center rounded-full border bg-white shadow-sm ${
                                                        isCover ? "text-amber-500" : "text-neutral-400 hover:text-amber-500"
                                                    }`}
                                                >
                                                    <Star className="h-3 w-3" fill={isCover ? "currentColor" : "none"} />
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={() => removeExistingImage(img)}
                                                    title="Remover foto"
                                                    aria-label="Remover foto"
                                                    className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full border bg-white text-red-500 shadow-sm hover:bg-red-50"
                                                >
                                                    <Trash2 className="h-3 w-3" />
                                                </button>
                                            </div>
                                        )
                                    })}

                                    {newPreviews.map((item, i) => (
                                        <div key={`new-${item.file.name}-${i}`} className="relative">
                                            <div className="w-20 h-20 rounded border border-dashed border-neutral-300 overflow-hidden">
                                                <img
                                                    src={item.url}
                                                    alt={`Nova foto ${i + 1}`}
                                                    className="w-full h-full object-cover"
                                                />
                                            </div>
                                            <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 rounded-full bg-neutral-800 px-1.5 py-0.5 text-[9px] text-white">
                                                nova
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => removeNewFile(i)}
                                                title="Remover foto"
                                                aria-label="Remover foto"
                                                className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full border bg-white text-red-500 shadow-sm hover:bg-red-50"
                                            >
                                                <Trash2 className="h-3 w-3" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {visibleExisting.length === 0 && newFiles.length === 0 && (
                            <div className="flex items-center gap-2 rounded-md border border-dashed border-neutral-200 px-3 py-2 text-xs text-neutral-400">
                                <ImageIcon className="h-4 w-4" />
                                Nenhuma foto adicionada ainda
                            </div>
                        )}

                        <div>
                            <Label htmlFor="description" className="font-medium">
                                Descrição
                            </Label>
                            <Textarea
                                id="description"
                                rows={3}
                                placeholder="Descreva as características e benefícios do produto..."
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="mt-2 resize-none"
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* ========== VARIAÇÕES E TAMANHOS ========== */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0">
                        <CardTitle className="text-lg">
                            Variações de Tamanho e Estoque <span className="text-red-500">*</span>
                        </CardTitle>
                        <Button
                            type="button"
                            onClick={addVariant}
                            variant="outline"
                            size="sm"
                            className="gap-2"
                        >
                            <Plus className="w-4 h-4" />
                            Adicionar Tamanho
                        </Button>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {fieldError("variants") && (
                            <div className="text-xs text-red-600 mb-3 p-2 bg-red-50 rounded">
                                {fieldError("variants")}
                            </div>
                        )}

                        {variants.map((v, i) => (
                            <div
                                key={i}
                                className={`p-4 border rounded-lg bg-gray-50 hover:bg-gray-100 transition ${
                                    fieldError(`variants.${i}.size`) ||
                                    fieldError(`variants.${i}.price`)
                                        ? "border-red-300"
                                        : "border-border"
                                }`}
                            >
                                <div className="grid grid-cols-2 gap-4 mb-3">
                                    <div>
                                        <Label htmlFor={`size-${i}`} className="text-xs font-medium">
                                            Tamanho <span className="text-red-500">*</span>
                                        </Label>
                                        <Input
                                            id={`size-${i}`}
                                            className={`mt-1 ${
                                                fieldError(`variants.${i}.size`) ? "border-red-500" : ""
                                            }`}
                                            placeholder="38, M, G, Único..."
                                            value={v.size}
                                            onChange={(e) => changeVariant(i, "size", e.target.value)}
                                        />
                                        {fieldError(`variants.${i}.size`) && (
                                            <p className="text-[10px] text-red-600 mt-1">
                                                {fieldError(`variants.${i}.size`)}
                                            </p>
                                        )}
                                    </div>

                                    <div>
                                        <Label htmlFor={`stock-${i}`} className="text-xs font-medium">
                                            Estoque (un.)
                                        </Label>
                                        <Input
                                            id={`stock-${i}`}
                                            className={`mt-1 ${
                                                fieldError(`variants.${i}.stock`) ? "border-red-500" : ""
                                            }`}
                                            type="number"
                                            min="0"
                                            value={v.stock}
                                            onChange={(e) =>
                                                changeVariant(i, "stock", e.target.value)
                                            }
                                        />
                                        {fieldError(`variants.${i}.stock`) && (
                                            <p className="text-[10px] text-red-600 mt-1">
                                                {fieldError(`variants.${i}.stock`)}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-4 mb-3">
                                    <div>
                                        <Label htmlFor={`cost-${i}`} className="text-xs font-medium">
                                            Custo (R$)
                                        </Label>
                                        <Input
                                            id={`cost-${i}`}
                                            className={`mt-1 ${
                                                fieldError(`variants.${i}.cost_price`) ? "border-red-500" : ""
                                            }`}
                                            placeholder="0.00"
                                            value={v.cost_price}
                                            onChange={(e) =>
                                                changeVariant(i, "cost_price", e.target.value)
                                            }
                                        />
                                        {fieldError(`variants.${i}.cost_price`) && (
                                            <p className="text-[10px] text-red-600 mt-1">
                                                {fieldError(`variants.${i}.cost_price`)}
                                            </p>
                                        )}
                                    </div>

                                    <div>
                                        <Label htmlFor={`price-${i}`} className="text-xs font-medium">
                                            Preço de venda (R$) <span className="text-red-500">*</span>
                                        </Label>
                                        <Input
                                            id={`price-${i}`}
                                            className={`mt-1 ${
                                                fieldError(`variants.${i}.price`) ? "border-red-500" : ""
                                            }`}
                                            placeholder="0.00"
                                            value={v.price}
                                            onChange={(e) =>
                                                changeVariant(i, "price", e.target.value)
                                            }
                                        />
                                        {fieldError(`variants.${i}.price`) && (
                                            <p className="text-[10px] text-red-600 mt-1">
                                                {fieldError(`variants.${i}.price`)}
                                            </p>
                                        )}
                                    </div>

                                    <div>
                                        <Label htmlFor={`barcode-${i}`} className="text-xs font-medium">
                                            Código de barras
                                        </Label>
                                        <Input
                                            id={`barcode-${i}`}
                                            className={`mt-1 ${
                                                fieldError(`variants.${i}.barcode`) ? "border-red-500" : ""
                                            }`}
                                            placeholder="Opcional"
                                            value={v.barcode}
                                            onChange={(e) =>
                                                changeVariant(i, "barcode", e.target.value)
                                            }
                                        />
                                        {fieldError(`variants.${i}.barcode`) && (
                                            <p className="text-[10px] text-red-600 mt-1">
                                                {fieldError(`variants.${i}.barcode`)}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {variants.length > 1 && (
                                    <div className="flex justify-end">
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => removeVariant(i)}
                                            className="gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                            Remover
                                        </Button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </CardContent>
                </Card>

                {/* ========== ESPECIFICAÇÕES ========== */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0">
                        <CardTitle className="text-lg">Especificações</CardTitle>

                        <div className="flex items-center gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={applyPresets}
                            >
                                Usar sugestões
                            </Button>

                            <Button
                                type="button"
                                onClick={addSpec}
                                variant="outline"
                                size="sm"
                                className="gap-2"
                            >
                                <Plus className="w-4 h-4" />
                                Adicionar
                            </Button>
                        </div>
                    </CardHeader>

                    <CardContent className="space-y-3">
                        {specs.map((spec, i) => (
                            <div
                                key={i}
                                className="grid grid-cols-[1fr_1fr_auto] gap-3 items-start"
                            >
                                <div>
                                    <Label htmlFor={`spec-label-${i}`} className="text-xs font-medium">
                                        Característica
                                    </Label>
                                    <Input
                                        id={`spec-label-${i}`}
                                        className="mt-1"
                                        placeholder="Ex: Material"
                                        value={spec.label}
                                        onChange={(e) =>
                                            changeSpec(i, "label", e.target.value)
                                        }
                                    />
                                </div>

                                <div>
                                    <Label htmlFor={`spec-value-${i}`} className="text-xs font-medium">
                                        Valor
                                    </Label>
                                    <Input
                                        id={`spec-value-${i}`}
                                        className="mt-1"
                                        placeholder="Ex: Couro Legítimo"
                                        value={spec.value}
                                        onChange={(e) =>
                                            changeSpec(i, "value", e.target.value)
                                        }
                                    />
                                </div>

                                <div className="pt-6">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => removeSpec(i)}
                                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>

                <div className="flex justify-end gap-3 pt-4">
                    {onCancel && (
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onCancel}
                            disabled={saving}
                        >
                            Cancelar
                        </Button>
                    )}
                    <Button type="submit" disabled={saving}>
                        {saving ? "Salvando..." : isEditing ? "Atualizar Produto" : "Salvar Produto"}
                    </Button>
                </div>
            </form>
        </div>
    )
}