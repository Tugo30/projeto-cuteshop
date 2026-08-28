import { useEffect, useState } from "react"
import axios from "axios"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table"

const csrf = () => document.querySelector('meta[name="csrf-token"]')?.content

export default function ProductList({ onEdit, refreshKey }) {
    const [products, setProducts] = useState([])
    const [loading, setLoading] = useState(true)

    async function loadProducts() {
        setLoading(true)
        try {
            const res = await axios.get("/api/admin/produtos")
            setProducts(res.data)
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { loadProducts() }, [refreshKey])

    async function handleDelete(product) {
        if (!confirm(`Excluir "${product.name}"? Essa ação não pode ser desfeita.`)) return
        try {
            await axios.delete(`/api/admin/produtos/${product.id}`, {
                headers: { "X-CSRF-TOKEN": csrf() }
            })
            loadProducts()
        } catch (err) {
            alert("Erro ao excluir produto.")
        }
    }

    function totalStock(product) {
        return product.variants?.reduce((sum, v) => sum + Number(v.stock), 0) ?? 0
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base">Produtos Cadastrados</CardTitle>
            </CardHeader>
            <CardContent>
                {loading ? (
                    <p className="text-sm text-neutral-500">Carregando...</p>
                ) : products.length === 0 ? (
                    <p className="text-sm text-neutral-500">Nenhum produto cadastrado ainda.</p>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nome</TableHead>
                                <TableHead>Categoria</TableHead>
                                <TableHead>Variações</TableHead>
                                <TableHead>Estoque Total</TableHead>
                                <TableHead className="text-right">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {products.map(product => (
                                <TableRow key={product.id}>
                                    <TableCell className="font-medium">{product.name}</TableCell>
                                    <TableCell>
                                        <span className="text-xs px-2 py-1 rounded-full bg-neutral-100 text-neutral-700">
                                            {product.category?.name ?? "—"}
                                        </span>
                                    </TableCell>
                                    <TableCell>{product.variants?.length ?? 0}</TableCell>
                                    <TableCell>{totalStock(product)}</TableCell>
                                    <TableCell className="text-right space-x-1">
                                        <Button variant="ghost" size="icon" onClick={() => onEdit(product)}>
                                            <i className="fas fa-pen" />
                                        </Button>
                                        <Button variant="ghost" size="icon" onClick={() => handleDelete(product)}>
                                            <i className="fas fa-trash text-red-600" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </CardContent>
        </Card>
    )
}