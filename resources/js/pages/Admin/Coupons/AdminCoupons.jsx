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
    Search,
    ArrowUpDown,
    AlertTriangle,
    Loader2,
    X,
    Ticket,
    Users,
} from "lucide-react"

const csrf = () =>
    document.querySelector('meta[name="csrf-token"]')?.content

const headers = () => ({ "X-CSRF-TOKEN": csrf() })

const PAGE_SIZE = 8

// Identidade visual do zLuz — mesma paleta usada no resto do admin.
// Centralizado aqui pra não ter cor "solta" espalhada pelo JSX.
const ACCENT = "#3D5A6C"
const INK = "#16161A"
const BORDER = "#E4E2DC"
const DANGER = "#b91c1c"

const inputStyle = {
    borderColor: BORDER,
}

const STATUS_FILTERS = [
    { value: "all", label: "Todos os status" },
    { value: "active", label: "Ativos" },
    { value: "inactive", label: "Inativos" },
    { value: "expired", label: "Expirados" },
]

const emptyForm = {
    codigo: "",
    tipo: "percentual",
    valor: "",
    validade: "",
    active: true,
    user_id: null,
    owner: null,
    max_uses: "",
    max_uses_per_user: 1,
}

function isExpired(coupon) {
    if (!coupon?.validade) return false
    return coupon.validade < new Date().toISOString().slice(0, 10)
}

function statusOf(coupon) {
    if (isExpired(coupon)) return "expired"
    if (!coupon.active) return "inactive"
    return "active"
}

function statusStyle(status) {
    switch (status) {
        case "expired":
            return { dot: "bg-rose-500", text: "text-rose-700", bg: "bg-rose-50", label: "Expirado" }
        case "inactive":
            return { dot: "bg-neutral-400", text: "text-neutral-700", bg: "bg-neutral-100", label: "Inativo" }
        default:
            return { dot: "bg-emerald-500", text: "text-emerald-700", bg: "bg-emerald-50", label: "Ativo" }
    }
}

function discountLabel(coupon) {
    if (coupon.tipo === "percentual") return `${coupon.valor}%`
    return Number(coupon.valor).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
    })
}

function apiError(err, fallback) {
    return (
        err.response?.data?.message ??
        Object.values(err.response?.data?.errors ?? {})[0]?.[0] ??
        fallback
    )
}

// Rótulo + texto de ajuda reutilizado em todos os campos do formulário,
// pra não depender só do placeholder (que some assim que o campo é preenchido).
function Field({ label, hint, htmlFor, children }) {
    return (
        <div>
            <label
                htmlFor={htmlFor}
                className="mb-1 block text-sm font-medium"
                style={{ color: INK }}
            >
                {label}
            </label>
            {children}
            {hint && <p className="mt-1 text-xs text-neutral-500">{hint}</p>}
        </div>
    )
}

export default function AdminCoupons() {
    const [coupons, setCoupons] = useState([])
    const [loading, setLoading] = useState(true)
    const [loadError, setLoadError] = useState(null)

    const [search, setSearch] = useState("")
    const [statusFilter, setStatusFilter] = useState("all")
    const [tipoFilter, setTipoFilter] = useState("all")
    const [sort, setSort] = useState({ key: "codigo", direction: "asc" })
    const [page, setPage] = useState(1)

    const [form, setForm] = useState(null)
    const [saving, setSaving] = useState(false)
    const [formError, setFormError] = useState(null)

    const [userQ, setUserQ] = useState("")
    const [users, setUsers] = useState([])
    const [searchingUsers, setSearchingUsers] = useState(false)

    const [detail, setDetail] = useState(null)
    const [detailLoading, setDetailLoading] = useState(false)

    const [pendingDelete, setPendingDelete] = useState(null)
    const [deletingId, setDeletingId] = useState(null)
    const [deleteError, setDeleteError] = useState(null)

    async function loadCoupons() {
        setLoading(true)
        setLoadError(null)

        try {
            const res = await axios.get("/api/admin/cupons")
            const items = Array.isArray(res.data)
                ? res.data
                : Array.isArray(res.data?.data)
                    ? res.data.data
                    : []
            setCoupons(items)
        } catch (err) {
            setLoadError(
                err.response?.status === 403
                    ? "Você não tem permissão para ver cupons."
                    : "Não foi possível carregar os cupons agora. Tente novamente em instantes."
            )
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadCoupons()
    }, [])

    useEffect(() => {
        setPage(1)
    }, [search, statusFilter, tipoFilter])

    useEffect(() => {
        if (!form && !detail && !pendingDelete) return

        function onKey(e) {
            if (e.key !== "Escape") return
            if (deletingId || saving) return
            if (pendingDelete) setPendingDelete(null)
            else if (detail) setDetail(null)
            else if (form) setForm(null)
        }

        window.addEventListener("keydown", onKey)
        return () => window.removeEventListener("keydown", onKey)
    }, [form, detail, pendingDelete, deletingId, saving])

    const filtered = useMemo(() => {
        const term = search.trim().toLowerCase()

        let list = coupons.filter((coupon) => {
            const matchesTerm =
                !term ||
                coupon.codigo?.toLowerCase().includes(term) ||
                coupon.owner?.username?.toLowerCase().includes(term) ||
                coupon.owner?.email?.toLowerCase().includes(term)

            const matchesStatus =
                statusFilter === "all" || statusOf(coupon) === statusFilter

            const matchesTipo =
                tipoFilter === "all" || coupon.tipo === tipoFilter

            return matchesTerm && matchesStatus && matchesTipo
        })

        list = [...list].sort((a, b) => {
            let cmp = 0

            if (sort.key === "codigo") {
                cmp = (a.codigo || "").localeCompare(b.codigo || "", "pt-BR")
            } else if (sort.key === "usos") {
                cmp = (a.used_count || 0) - (b.used_count || 0)
            } else if (sort.key === "validade") {
                cmp = (a.validade || "9999").localeCompare(b.validade || "9999")
            }

            return sort.direction === "asc" ? cmp : -cmp
        })

        return list
    }, [coupons, search, statusFilter, tipoFilter, sort])

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
    const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

    function toggleSort(key) {
        setSort((prev) =>
            prev.key === key
                ? { key, direction: prev.direction === "asc" ? "desc" : "asc" }
                : { key, direction: "asc" }
        )
    }

    function openCreate() {
        setForm({ ...emptyForm })
        setFormError(null)
        setUserQ("")
        setUsers([])
    }

    function openEdit(coupon) {
        setForm({
            ...emptyForm,
            ...coupon,
            max_uses: coupon.max_uses ?? "",
            validade: coupon.validade ?? "",
            max_uses_per_user: coupon.max_uses_per_user ?? 1,
        })
        setFormError(null)
        setUserQ(coupon.owner?.username ?? "")
        setUsers([])
    }

    function closeForm() {
        if (saving) return
        setForm(null)
    }

    async function save(e) {
        e.preventDefault()
        if (!form || saving) return

        if (form.tipo === "percentual" && Number(form.valor) > 100) {
            setFormError("Percentual no máximo 100.")
            return
        }

        setSaving(true)
        setFormError(null)

        const payload = {
            codigo: String(form.codigo).trim().toUpperCase(),
            tipo: form.tipo,
            valor: Number(form.valor),
            validade: form.validade || null,
            active: Boolean(form.active),
            user_id: form.user_id || null,
            max_uses: form.max_uses === "" ? null : Number(form.max_uses),
            max_uses_per_user: Number(form.max_uses_per_user) || 1,
        }

        try {
            if (form.id) {
                await axios.put(`/api/admin/cupons/${form.id}`, payload, { headers: headers() })
            } else {
                await axios.post("/api/admin/cupons", payload, { headers: headers() })
            }
            setForm(null)
            await loadCoupons()
        } catch (err) {
            setFormError(
                err.response?.status === 403
                    ? "Você não tem permissão para salvar cupons."
                    : apiError(err, "Erro ao salvar o cupom.")
            )
        } finally {
            setSaving(false)
        }
    }

    async function openDetail(id) {
        setDetailLoading(true)
        setDetail({ id })
        try {
            const res = await axios.get(`/api/admin/cupons/${id}`)
            setDetail(res.data)
        } catch (err) {
            setDetail({
                id,
                codigo: "—",
                usos: [],
                loadError: apiError(err, "Não foi possível carregar os usos."),
            })
        } finally {
            setDetailLoading(false)
        }
    }

    async function searchUsers(q) {
        setUserQ(q)
        if (q.trim().length < 2) {
            setUsers([])
            return
        }

        setSearchingUsers(true)
        try {
            const res = await axios.get("/api/admin/cupons/usuarios", { params: { q } })
            setUsers(Array.isArray(res.data) ? res.data : [])
        } catch {
            setUsers([])
        } finally {
            setSearchingUsers(false)
        }
    }

    async function confirmDelete() {
        if (!pendingDelete) return

        setDeletingId(pendingDelete.id)
        setDeleteError(null)

        try {
            await axios.delete(`/api/admin/cupons/${pendingDelete.id}`, {
                headers: headers(),
            })
            setPendingDelete(null)
            await loadCoupons()
        } catch (err) {
            setDeleteError(
                err.response?.status === 403
                    ? "Só o admin pode excluir cupons."
                    : apiError(err, "Não foi possível excluir o cupom.")
            )
        } finally {
            setDeletingId(null)
        }
    }

    return (
        <div className="max-w-5xl space-y-6 font-sans" style={{ fontFamily: "'Inter', sans-serif" }}>
            <Card className="border-0 shadow-sm">
                <CardHeader className="border-b bg-white">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div>
                            <CardTitle
                                className="text-lg font-semibold"
                                style={{
                                    fontFamily: "'Fraunces', serif",
                                    color: INK,
                                }}
                            >
                                Cupons
                            </CardTitle>
                            <p className="mt-1 text-sm text-neutral-500">
                                Desconto da loja e cupom de afiliado.
                            </p>
                        </div>

                        <div className="flex items-center gap-2">
                            <span
                                className="rounded-md border px-2.5 py-1 text-xs"
                                style={{
                                    fontFamily: "'IBM Plex Mono', monospace",
                                    borderColor: BORDER,
                                    color: INK,
                                }}
                            >
                                {filtered.length}{" "}
                                {filtered.length === 1 ? "cupom" : "cupons"}
                                {filtered.length !== coupons.length &&
                                    ` de ${coupons.length}`}
                            </span>
                            <Button
                                type="button"
                                onClick={openCreate}
                                className="bg-black border-0 text-white hover:opacity-90"
                                style={{ backgroundColor: ACCENT }}
                            >
                                Novo cupom
                            </Button>
                        </div>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-2">
                        <div className="relative min-w-[220px] flex-1">
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Buscar código ou dono..."
                                aria-label="Buscar cupons"
                                className="w-full rounded-md border py-2 pl-9 pr-8 text-sm outline-none transition-colors focus:ring-2"
                                style={{ ...inputStyle, "--tw-ring-color": `${ACCENT}4D` }}
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
                            value={tipoFilter}
                            onChange={(e) => setTipoFilter(e.target.value)}
                            aria-label="Filtrar por tipo"
                            className="rounded-md border px-3 py-2 text-sm text-neutral-700 outline-none focus:ring-2"
                            style={{ ...inputStyle, "--tw-ring-color": `${ACCENT}4D` }}
                        >
                            <option value="all">Todos os tipos</option>
                            <option value="percentual">Percentual</option>
                            <option value="fixo">Valor fixo</option>
                        </select>

                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            aria-label="Filtrar por status"
                            className="rounded-md border px-3 py-2 text-sm text-neutral-700 outline-none focus:ring-2"
                            style={{ ...inputStyle, "--tw-ring-color": `${ACCENT}4D` }}
                        >
                            {STATUS_FILTERS.map((opt) => (
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
                            <Button variant="outline" onClick={loadCoupons}>
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
                                    <div className="h-10 w-24 rounded bg-neutral-100" />
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
                                <Ticket className="h-6 w-6 text-neutral-400" />
                            </div>
                            <p className="font-medium text-neutral-700">
                                {coupons.length === 0
                                    ? "Nenhum cupom cadastrado"
                                    : "Nenhum cupom encontrado"}
                            </p>
                            <p className="mt-1 text-sm text-neutral-500">
                                {coupons.length === 0
                                    ? "Crie o primeiro cupom para começar."
                                    : "Ajuste a busca ou os filtros para ver outros cupons."}
                            </p>
                        </div>
                    ) : (
                        <>
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-neutral-50 hover:bg-neutral-50">
                                            <TableHead>
                                                <button
                                                    type="button"
                                                    onClick={() => toggleSort("codigo")}
                                                    className="inline-flex items-center gap-1 hover:text-neutral-900"
                                                >
                                                    Código
                                                    <ArrowUpDown className="h-3 w-3" />
                                                </button>
                                            </TableHead>
                                            <TableHead>Desconto</TableHead>
                                            <TableHead>Dono</TableHead>
                                            <TableHead>
                                                <button
                                                    type="button"
                                                    onClick={() => toggleSort("usos")}
                                                    className="inline-flex items-center gap-1 hover:text-neutral-900"
                                                >
                                                    Usos
                                                    <ArrowUpDown className="h-3 w-3" />
                                                </button>
                                            </TableHead>
                                            <TableHead>
                                                <button
                                                    type="button"
                                                    onClick={() => toggleSort("validade")}
                                                    className="inline-flex items-center gap-1 hover:text-neutral-900"
                                                >
                                                    Validade
                                                    <ArrowUpDown className="h-3 w-3" />
                                                </button>
                                            </TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead className="text-right">Ações</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {paged.map((coupon) => {
                                            const status = statusOf(coupon)
                                            const style = statusStyle(status)
                                            const isDeleting = deletingId === coupon.id

                                            return (
                                                <TableRow
                                                    key={coupon.id}
                                                    className="group transition-colors hover:bg-neutral-50"
                                                >
                                                    <TableCell>
                                                        <span
                                                            className="font-medium text-neutral-800"
                                                            style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                                                        >
                                                            {coupon.codigo}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell className="text-sm text-neutral-700">
                                                        {discountLabel(coupon)}
                                                    </TableCell>
                                                    <TableCell className="text-sm text-neutral-600">
                                                        {coupon.owner?.username ?? "Loja"}
                                                    </TableCell>
                                                    <TableCell>
                                                        <span
                                                            className="text-sm text-neutral-600"
                                                            style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                                                        >
                                                            {coupon.used_count}
                                                            {coupon.max_uses ? ` / ${coupon.max_uses}` : ""}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell className="text-sm text-neutral-600">
                                                        {coupon.validade
                                                            ? new Date(coupon.validade + "T00:00:00").toLocaleDateString("pt-BR")
                                                            : "—"}
                                                    </TableCell>
                                                    <TableCell>
                                                        <span
                                                            className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium ${style.bg} ${style.text}`}
                                                        >
                                                            <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
                                                            {style.label}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="flex justify-end gap-1">
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="icon"
                                                                title="Ver usos"
                                                                aria-label={`Ver usos de ${coupon.codigo}`}
                                                                onClick={() => openDetail(coupon.id)}
                                                                className="text-neutral-600 hover:bg-neutral-100"
                                                            >
                                                                <Users className="h-4 w-4" />
                                                            </Button>
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="icon"
                                                                title="Editar cupom"
                                                                aria-label={`Editar ${coupon.codigo}`}
                                                                onClick={() => openEdit(coupon)}
                                                                className="text-neutral-600 hover:bg-[#3D5A6C]/10 hover:text-[#3D5A6C]"
                                                            >
                                                                <Pencil className="h-4 w-4" />
                                                            </Button>
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="icon"
                                                                title="Excluir cupom"
                                                                aria-label={`Excluir ${coupon.codigo}`}
                                                                disabled={isDeleting}
                                                                onClick={() => {
                                                                    setDeleteError(null)
                                                                    setPendingDelete(coupon)
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
            </Card>

            {/* Criar/editar cupom — agora é um modal próprio, não fica mais
                empilhado em cima da lista. */}
            {form && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-8"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="coupon-form-title"
                    onClick={(e) => {
                        if (e.target === e.currentTarget) closeForm()
                    }}
                >
                    <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white shadow-lg">
                        <div className="flex items-start justify-between gap-3 border-b px-6 py-5">
                            <div>
                                <h2
                                    id="coupon-form-title"
                                    className="text-lg font-semibold"
                                    style={{ fontFamily: "'Fraunces', serif", color: INK }}
                                >
                                    {form.id ? "Editar cupom" : "Novo cupom"}
                                </h2>
                                <p className="mt-1 text-sm text-neutral-500">
                                    Desconto da loja ou cupom de afiliado. O dono não precisa ser quem usa.
                                </p>
                            </div>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                aria-label="Fechar"
                                onClick={closeForm}
                                className="shrink-0 text-neutral-500 hover:bg-neutral-100"
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </div>

                        <form onSubmit={save} className="space-y-5 px-6 py-6">
                            {formError && (
                                <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">
                                    {formError}
                                </p>
                            )}

                            <Field
                                label="Código do cupom"
                                htmlFor="coupon-codigo"
                                hint="O que o cliente digita no carrinho pra aplicar o desconto."
                            >
                                <input
                                    id="coupon-codigo"
                                    required
                                    minLength={3}
                                    maxLength={30}
                                    value={form.codigo}
                                    onChange={(e) =>
                                        setForm({ ...form, codigo: e.target.value.toUpperCase() })
                                    }
                                    placeholder="Ex: USER1AMIGO"
                                    className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2"
                                    style={{
                                        ...inputStyle,
                                        "--tw-ring-color": `${ACCENT}4D`,
                                        fontFamily: "'IBM Plex Mono', monospace",
                                    }}
                                />
                            </Field>

                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                <Field label="Tipo de desconto" htmlFor="coupon-tipo">
                                    <select
                                        id="coupon-tipo"
                                        value={form.tipo}
                                        onChange={(e) => setForm({ ...form, tipo: e.target.value })}
                                        className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2"
                                        style={{ ...inputStyle, "--tw-ring-color": `${ACCENT}4D` }}
                                    >
                                        <option value="percentual">Percentual (%)</option>
                                        <option value="fixo">Valor fixo (R$)</option>
                                    </select>
                                </Field>
                                <Field label="Valor do desconto" htmlFor="coupon-valor">
                                    <input
                                        id="coupon-valor"
                                        required
                                        type="number"
                                        step="0.01"
                                        min="0.01"
                                        max={form.tipo === "percentual" ? "100" : undefined}
                                        value={form.valor}
                                        onChange={(e) => setForm({ ...form, valor: e.target.value })}
                                        placeholder={form.tipo === "percentual" ? "Ex: 10" : "Ex: 25,00"}
                                        className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2"
                                        style={{ ...inputStyle, "--tw-ring-color": `${ACCENT}4D` }}
                                    />
                                </Field>
                            </div>
                            <p className="-mt-3 text-xs text-neutral-500">
                                Percentual desconta um % do total do pedido; valor fixo desconta um valor em reais.
                            </p>

                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                <Field
                                    label="Validade"
                                    htmlFor="coupon-validade"
                                    hint="Deixe em branco pra não expirar."
                                >
                                    <input
                                        id="coupon-validade"
                                        type="date"
                                        value={form.validade}
                                        onChange={(e) => setForm({ ...form, validade: e.target.value })}
                                        className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2"
                                        style={{ ...inputStyle, "--tw-ring-color": `${ACCENT}4D` }}
                                    />
                                </Field>
                                <Field
                                    label="Limite total de usos"
                                    htmlFor="coupon-max-uses"
                                    hint="Quantas vezes esse cupom pode ser usado no total. Vazio = ilimitado."
                                >
                                    <input
                                        id="coupon-max-uses"
                                        type="number"
                                        min="1"
                                        value={form.max_uses}
                                        onChange={(e) => setForm({ ...form, max_uses: e.target.value })}
                                        placeholder="Ilimitado"
                                        className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2"
                                        style={{ ...inputStyle, "--tw-ring-color": `${ACCENT}4D` }}
                                    />
                                </Field>
                            </div>

                            <Field
                                label="Usos por cliente"
                                htmlFor="coupon-max-uses-per-user"
                                hint="Quantas vezes cada cliente pode usar esse cupom (padrão: 1)."
                            >
                                <input
                                    id="coupon-max-uses-per-user"
                                    required
                                    type="number"
                                    min="1"
                                    max="50"
                                    value={form.max_uses_per_user}
                                    onChange={(e) =>
                                        setForm({ ...form, max_uses_per_user: e.target.value })
                                    }
                                    className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2"
                                    style={{ ...inputStyle, "--tw-ring-color": `${ACCENT}4D` }}
                                />
                            </Field>

                            <Field
                                label="Dono do cupom (afiliado) — opcional"
                                htmlFor="coupon-owner"
                                hint="Vincule um afiliado pra rastrear quem indicou a venda. Deixe em branco se for um desconto geral da loja."
                            >
                                <input
                                    id="coupon-owner"
                                    value={userQ}
                                    onChange={(e) => searchUsers(e.target.value)}
                                    placeholder="Buscar username ou e-mail"
                                    className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2"
                                    style={{ ...inputStyle, "--tw-ring-color": `${ACCENT}4D` }}
                                />
                                {form.owner && (
                                    <p className="mt-1 text-xs text-neutral-600">
                                        Atual: {form.owner.username} · {form.owner.email}
                                    </p>
                                )}
                                {searchingUsers && (
                                    <p className="mt-1 text-xs text-neutral-400">Buscando…</p>
                                )}
                                {users.map((u) => (
                                    <button
                                        key={u.id}
                                        type="button"
                                        className="mt-1 block text-left text-sm underline"
                                        style={{ color: ACCENT }}
                                        onClick={() => {
                                            setForm({ ...form, user_id: u.id, owner: u })
                                            setUsers([])
                                            setUserQ(u.username)
                                        }}
                                    >
                                        {u.username} · {u.email}
                                    </button>
                                ))}
                                {form.user_id && (
                                    <button
                                        type="button"
                                        className="mt-2 text-xs text-rose-700"
                                        onClick={() => {
                                            setForm({ ...form, user_id: null, owner: null })
                                            setUserQ("")
                                            setUsers([])
                                        }}
                                    >
                                        Remover dono
                                    </button>
                                )}
                            </Field>

                            <label className="flex items-center gap-2 text-sm text-neutral-700">
                                <input
                                    type="checkbox"
                                    checked={Boolean(form.active)}
                                    onChange={(e) => setForm({ ...form, active: e.target.checked })}
                                    style={{ accentColor: ACCENT }}
                                />
                                Cupom ativo — aparece pra clientes usarem agora
                            </label>

                            <div className="flex justify-end gap-2 border-t pt-4">
                                <Button
                                    type="button"
                                    variant="outline"
                                    disabled={saving}
                                    onClick={closeForm}
                                >
                                    Cancelar
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={saving}
                                    className="bg-black border-0 text-white hover:opacity-90"
                                    style={{ backgroundColor: ACCENT }}
                                >
                                    {saving ? (
                                        <span className="inline-flex items-center gap-2">
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            Salvando...
                                        </span>
                                    ) : (
                                        "Salvar cupom"
                                    )}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {detail && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="usos-title"
                    onClick={(e) => {
                        if (e.target === e.currentTarget) setDetail(null)
                    }}
                >
                    <div className="max-h-[80vh] w-full max-w-md overflow-y-auto rounded-xl bg-white p-6 shadow-lg">
                        <div className="mb-4 flex items-start justify-between gap-3">
                            <div>
                                <h2
                                    id="usos-title"
                                    className="font-semibold"
                                    style={{ fontFamily: "'IBM Plex Mono', monospace", color: INK }}
                                >
                                    {detail.codigo}
                                </h2>
                                <p className="mt-1 text-sm text-neutral-500">
                                    Dono: {detail.owner?.username ?? "loja"}
                                    {" · "}
                                    {detail.used_count ?? 0}
                                    {detail.max_uses ? ` / ${detail.max_uses}` : " usos"}
                                </p>
                            </div>
                            <Button type="button" variant="ghost" size="sm" onClick={() => setDetail(null)}>
                                Fechar
                            </Button>
                        </div>

                        {detailLoading ? (
                            <p className="text-sm text-neutral-500">Carregando usos…</p>
                        ) : detail.loadError ? (
                            <p className="text-sm text-rose-700">{detail.loadError}</p>
                        ) : (
                            <ul className="m-0 list-none divide-y p-0 text-sm">
                                {(detail.usos ?? []).length === 0 && (
                                    <li className="py-3 text-neutral-500">Ninguém usou ainda.</li>
                                )}
                                {(detail.usos ?? []).map((u) => (
                                    <li key={u.code} className="py-3">
                                        <p
                                            className="m-0 text-[11px] text-neutral-500"
                                            style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                                        >
                                            {u.code}
                                        </p>
                                        <p className="m-0 text-neutral-800">
                                            {u.username ?? u.customer_name} · {u.status}
                                        </p>
                                        <p className="m-0 text-xs text-neutral-500">
                                            desconto{" "}
                                            {Number(u.discount).toLocaleString("pt-BR", {
                                                style: "currency",
                                                currency: "BRL",
                                            })}
                                        </p>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            )}

            {pendingDelete && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="delete-coupon-title"
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
                                    id="delete-coupon-title"
                                    className="font-semibold"
                                    style={{ fontFamily: "'Fraunces', serif", color: INK }}
                                >
                                    Excluir "{pendingDelete.codigo}"?
                                </h2>
                                <p className="mt-1 text-sm text-neutral-500">
                                    Se o cupom já foi usado em algum pedido, a exclusão será
                                    recusada — desative em vez de apagar.
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
                                style={{ backgroundColor: DANGER }}
                                className="text-white hover:opacity-90"
                            >
                                {deletingId ? (
                                    <span className="inline-flex items-center gap-2">
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Excluindo...
                                    </span>
                                ) : (
                                    "Excluir cupom"
                                )}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
