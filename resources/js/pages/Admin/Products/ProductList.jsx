import { useEffect, useMemo, useState } from "react"
import axios from "axios"
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {
    Pencil,
    Trash2,
    Image as ImageIcon,
    Search,
    ArrowUpDown,
    AlertTriangle,
    Loader2,
    X,
} from "lucide-react"

const csrf = () =>
    document.querySelector('meta[name="csrf-token"]')?.content

const PAGE_SIZE = 8

const STOCK_FILTERS = [
    { value: "all", label: "Todo o estoque" },
    { value: "out", label: "Sem estoque" },
    { value: "low", label: "Estoque baixo" },
    { value: "ok", label: "Estoque normal" },
]

export default function ProductList({ onEdit, refreshKey }) {
    const [products, setProducts] = useState([])
    const [loading, setLoading] = useState(true)
    const [loadError, setLoadError] = useState(null)

    const [search, setSearch] = useState("")
    const [category, setCategory] = useState("all")
    const [stockFilter, setStockFilter] = useState("all")
    const [sort, setSort] = useState({ key: "name", direction: "asc" })
    const [page, setPage] = useState(1)

    const [pendingDelete, setPendingDelete] = useState(null)
    const [deletingId, setDeletingId] = useState(null)
    const [deleteError, setDeleteError] = useState(null)

    async function loadProducts() {
        setLoading(true)
        setLoadError(null)

        try {
            const res = await axios.get("/api/admin/produtos")

            // Verifica se é array direto OU se está envelopado dentro de res.data.data (padrão Laravel)
            const items = Array.isArray(res.data)
                ? res.data
                : Array.isArray(res.data?.data)
                    ? res.data.data
                    : []

            setProducts(items)
        } catch (err) {
            console.error("Erro ao carregar produtos:", err)
            setLoadError(
                "Não foi possível carregar os produtos agora. Tente novamente em instantes."
            )
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadProducts()
    }, [refreshKey])

    useEffect(() => {
        setPage(1)
    }, [search, category, stockFilter])

    // Proteção adicionada para evitar que quebre caso variants venha nulo/indefinido
    function totalStock(product) {
        if (!Array.isArray(product?.variants)) return 0
        return product.variants.reduce(
            (sum, variant) => sum + Number(variant?.stock || 0),
            0
        )
    }

    function getProductImage(product) {
        return (
            product?.images?.[0]?.url ||
            product?.image_url ||
            product?.image ||
            null
        )
    }

    function stockLevel(stock) {
        if (stock === 0) return "out"
        if (stock <= 5) return "low"
        return "ok"
    }

    function stockStyle(level) {
        switch (level) {
            case "out":
                return { dot: "bg-rose-500", text: "text-rose-700", bg: "bg-rose-50" }
            case "low":
                return { dot: "bg-amber-500", text: "text-amber-700", bg: "bg-amber-50" }
            default:
                return { dot: "bg-emerald-500", text: "text-emerald-700", bg: "bg-emerald-50" }
        }
    }

    const categories = useMemo(() => {
        if (!Array.isArray(products)) return []
        const set = new Set(
            products.map((p) => p.category?.name).filter(Boolean)
        )
        return Array.from(set).sort()
    }, [products])

    const filtered = useMemo(() => {
        if (!Array.isArray(products)) return []

        const term = search.trim().toLowerCase()

        let list = products.filter((product) => {
            const matchesTerm =
                !term ||
                product.name?.toLowerCase().includes(term) ||
                product.description?.toLowerCase().includes(term)

            const matchesCategory =
                category === "all" || product.category?.name === category

            const stock = totalStock(product)
            const matchesStock =
                stockFilter === "all" || stockLevel(stock) === stockFilter

            return matchesTerm && matchesCategory && matchesStock
        })

        list = [...list].sort((a, b) => {
            let cmp = 0

            if (sort.key === "name") {
                cmp = (a.name || "").localeCompare(b.name || "", "pt-BR")
            } else if (sort.key === "stock") {
                cmp = totalStock(a) - totalStock(b)
            }

            return sort.direction === "asc" ? cmp : -cmp
        })

        return list
    }, [products, search, category, stockFilter, sort])

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
    const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

    function toggleSort(key) {
        setSort((prev) =>
            prev.key === key
                ? { key, direction: prev.direction === "asc" ? "desc" : "asc" }
                : { key, direction: "asc" }
        )
    }

    async function confirmDelete() {
        if (!pendingDelete) return

        setDeletingId(pendingDelete.id)
        setDeleteError(null)

        try {
            await axios.delete(`/api/admin/produtos/${pendingDelete.id}`, {
                headers: {
                    "X-CSRF-TOKEN": csrf(),
                },
            })

            setPendingDelete(null)
            await loadProducts()
        } catch (err) {
            console.error(err)
            setDeleteError(
                "Não foi possível excluir o produto. Verifique sua conexão e tente novamente."
            )
        } finally {
            setDeletingId(null)
        }
    }

    return (
        <Card
            className="border-0 shadow-sm font-sans"
            style={{ fontFamily: "'Inter', sans-serif" }}
        >
            <CardHeader className="border-b bg-white">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <CardTitle
                            className="text-lg font-semibold"
                            style={{
                                fontFamily: "'Fraunces', serif",
                                color: "#16161A",
                            }}
                        >
                            Produtos cadastrados
                        </CardTitle>

                        <p className="mt-1 text-sm text-neutral-500">
                            Gerencie os produtos, fotos e estoque da sua loja.
                        </p>
                    </div>

                    <span
                        className="rounded-md border px-2.5 py-1 text-xs"
                        style={{
                            fontFamily: "'IBM Plex Mono', monospace",
                            borderColor: "#E4E2DC",
                            color: "#16161A",
                        }}
                    >
                        {filtered.length}{" "}
                        {filtered.length === 1 ? "produto" : "produtos"}
                        {filtered.length !== products.length &&
                            ` de ${products.length}`}
                    </span>
                </div>

                {/* Barra de busca e filtros */}
                <div className="mt-4 flex flex-wrap items-center gap-2">
                    <div className="relative flex-1 min-w-[220px]">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Buscar por nome ou descrição..."
                            aria-label="Buscar produtos"
                            className="w-full rounded-md border py-2 pl-9 pr-8 text-sm outline-none transition-colors focus:ring-2 focus:ring-slate-400"
                            style={{ borderColor: "#E4E2DC" }}
                        />
                        {search && (
                            <button
                                type="button"
                                onClick={() => setSearch("")}
                                aria-label="Limpar busca"
                                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-neutral-400 hover:text-neutral-700"
                            >
                                <X className="h-3.5 w-3.5" />
                            </button>
                        )}
                    </div>

                    <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        aria-label="Filtrar por categoria"
                        className="rounded-md border px-3 py-2 text-sm text-neutral-700 outline-none focus:ring-2"
                        style={{ borderColor: "#E4E2DC" }}
                    >
                        <option value="all">Todas as categorias</option>
                        {categories.map((name) => (
                            <option key={name} value={name}>
                                {name}
                            </option>
                        ))}
                    </select>

                    <select
                        value={stockFilter}
                        onChange={(e) => setStockFilter(e.target.value)}
                        aria-label="Filtrar por estoque"
                        className="rounded-md border px-3 py-2 text-sm text-neutral-700 outline-none focus:ring-2"
                        style={{ borderColor: "#E4E2DC" }}
                    >
                        {STOCK_FILTERS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                                {opt.label}
                            </option>
                        ))}
                    </select>
                </div>
            </CardHeader>

            <CardContent className="p-0">
                {loadError ? (
                    <div className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
                        <AlertTriangle className="h-8 w-8 text-rose-400" />
                        <p className="font-medium text-neutral-700">{loadError}</p>
                        <Button variant="outline" onClick={loadProducts}>
                            Tentar novamente
                        </Button>
                    </div>
                ) : loading ? (
                    <div className="divide-y">
                        {Array.from({ length: 5 }).map((_, i) => (
                            <div
                                key={i}
                                className="flex animate-pulse items-center gap-4 px-6 py-4"
                            >
                                <div className="h-14 w-14 rounded-xl bg-neutral-100" />
                                <div className="flex-1 space-y-2">
                                    <div className="h-3 w-1/3 rounded bg-neutral-100" />
                                    <div className="h-3 w-1/2 rounded bg-neutral-100" />
                                </div>
                                <div className="h-6 w-20 rounded bg-neutral-100" />
                            </div>
                        ))}
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
                        <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-neutral-100">
                            <ImageIcon className="h-6 w-6 text-neutral-400" />
                        </div>

                        <p className="font-medium text-neutral-700">
                            {products.length === 0
                                ? "Nenhum produto cadastrado"
                                : "Nenhum produto encontrado"}
                        </p>

                        <p className="mt-1 text-sm text-neutral-500">
                            {products.length === 0
                                ? "Cadastre seu primeiro produto para começar."
                                : "Ajuste a busca ou os filtros para ver outros produtos."}
                        </p>
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-neutral-50 hover:bg-neutral-50">
                                        <TableHead className="w-[90px]">
                                            Foto
                                        </TableHead>

                                        <TableHead>
                                            <button
                                                type="button"
                                                onClick={() => toggleSort("name")}
                                                className="inline-flex items-center gap-1 hover:text-neutral-900"
                                            >
                                                Produto
                                                <ArrowUpDown className="h-3 w-3" />
                                            </button>
                                        </TableHead>

                                        <TableHead>Categoria</TableHead>
                                        <TableHead>Variações</TableHead>

                                        <TableHead>
                                            <button
                                                type="button"
                                                onClick={() => toggleSort("stock")}
                                                className="inline-flex items-center gap-1 hover:text-neutral-900"
                                            >
                                                Estoque
                                                <ArrowUpDown className="h-3 w-3" />
                                            </button>
                                        </TableHead>

                                        <TableHead className="text-right">
                                            Ações
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>

                                <TableBody>
                                    {paged.map((product) => {
                                        const image = getProductImage(product)
                                        const stock = totalStock(product)
                                        const level = stockLevel(stock)
                                        const style = stockStyle(level)
                                        const isDeleting = deletingId === product.id

                                        return (
                                            <TableRow
                                                key={product.id}
                                                className="group transition-colors hover:bg-neutral-50"
                                            >
                                                <TableCell>
                                                    <div className="h-16 w-16 overflow-hidden rounded-xl border bg-neutral-100">
                                                        {image ? (
                                                            <img
                                                                src={image}
                                                                alt={product.name}
                                                                loading="lazy"
                                                                className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                                                                onError={(event) => {
                                                                    event.currentTarget.style.display =
                                                                        "none"
                                                                }}
                                                            />
                                                        ) : (
                                                            <div className="flex h-full w-full items-center justify-center">
                                                                <ImageIcon className="h-6 w-6 text-neutral-400" />
                                                            </div>
                                                        )}
                                                    </div>
                                                </TableCell>

                                                <TableCell>
                                                    <div className="min-w-[200px]">
                                                        <p className="font-semibold text-neutral-800">
                                                            {product.name}
                                                        </p>

                                                        {product.description && (
                                                            <p className="mt-1 max-w-xs truncate text-xs text-neutral-500">
                                                                {product.description}
                                                            </p>
                                                        )}
                                                    </div>
                                                </TableCell>

                                                <TableCell>
                                                    <span className="rounded-md border border-neutral-200 px-2 py-0.5 text-xs text-neutral-700">
                                                        {product.category?.name ?? "Sem categoria"}
                                                    </span>
                                                </TableCell>

                                                <TableCell>
                                                    <span
                                                        className="text-sm text-neutral-600"
                                                        style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                                                    >
                                                        {product.variants?.length ?? 0}
                                                    </span>
                                                </TableCell>

                                                <TableCell>
                                                    <span
                                                        className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium ${style.bg} ${style.text}`}
                                                    >
                                                        <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
                                                        <span style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                                                            {stock === 0 ? "Sem estoque" : `${stock} un.`}
                                                        </span>
                                                    </span>
                                                </TableCell>

                                                <TableCell className="text-right">
                                                    <div className="flex justify-end gap-1">
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="icon"
                                                            title="Editar produto"
                                                            aria-label={`Editar ${product.name}`}
                                                            onClick={() => onEdit(product)}
                                                            className="text-neutral-600 hover:bg-blue-50 hover:text-blue-600"
                                                        >
                                                            <Pencil className="h-4 w-4" />
                                                        </Button>

                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="icon"
                                                            title="Excluir produto"
                                                            aria-label={`Excluir ${product.name}`}
                                                            disabled={isDeleting}
                                                            onClick={() => {
                                                                setDeleteError(null)
                                                                setPendingDelete(product)
                                                            }}
                                                            className="text-neutral-600 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                                                        >
                                                            {isDeleting ? (
                                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                            ) : (
                                                                <Trash2 className="h-4 w-4" />
                                                            )}
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        )
                                    })}
                                </TableBody>
                            </Table>
                        </div>

                        {totalPages > 1 && (
                            <div className="flex items-center justify-between border-t px-6 py-3">
                                <p className="text-xs text-neutral-500">
                                    Página {page} de {totalPages}
                                </p>
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        disabled={page === 1}
                                        onClick={() => setPage((p) => p - 1)}
                                    >
                                        Anterior
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        disabled={page === totalPages}
                                        onClick={() => setPage((p) => p + 1)}
                                    >
                                        Próxima
                                    </Button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </CardContent>

            {/* Modal de confirmação de exclusão */}
            {pendingDelete && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="delete-title"
                    onClick={(e) => {
                        if (e.target === e.currentTarget && !deletingId) {
                            setPendingDelete(null)
                        }
                    }}
                >
                    <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-lg">
                        <div className="flex items-start gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-rose-50">
                                <AlertTriangle className="h-4 w-4 text-rose-500" />
                            </div>
                            <div>
                                <h2
                                    id="delete-title"
                                    className="font-semibold"
                                    style={{ fontFamily: "'Fraunces', serif", color: "#16161A" }}
                                >
                                    Excluir "{pendingDelete.name}"?
                                </h2>
                                <p className="mt-1 text-sm text-neutral-500">
                                    Essa ação não pode ser desfeita. O produto e suas
                                    variações serão removidos permanentemente.
                                </p>
                            </div>
                        </div>

                        {deleteError && (
                            <p className="mt-3 rounded-md bg-rose-50 px-3 py-2 text-xs text-rose-700">
                                {deleteError}
                            </p>
                        )}

                        <div className="mt-5 flex justify-end gap-2">
                            <Button
                                variant="outline"
                                disabled={!!deletingId}
                                onClick={() => setPendingDelete(null)}
                            >
                                Cancelar
                            </Button>
                            <Button
                                disabled={!!deletingId}
                                onClick={confirmDelete}
                                style={{ backgroundColor: "#b91c1c" }}
                                className="text-white hover:opacity-90"
                            >
                                {deletingId ? (
                                    <span className="inline-flex items-center gap-2">
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Excluindo...
                                    </span>
                                ) : (
                                    "Excluir produto"
                                )}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </Card>
    )
}