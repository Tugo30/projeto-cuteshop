import React, { useEffect, useState } from 'react'
import axios from "axios"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table"

const csrf = () => document.querySelector('meta[name="csrf-token"]')?.content

export default function CategoryList({ onEdit, refreshKey }) {
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true)

    async function load() {
        setLoading(true)
        try {
            const res = await axios.get("/api/admin/categorias")
            setCategories(res.data)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { load() }, [refreshKey])

    async function handleDelete(category) {
        if (confirm(`Excluir "${category.name}"`)) {
            try {
                await axios.delete(`/api/admin/categorias/${category.id}`, {
                    headers: { "X-CSRF-TOKEN": csrf() }
                })
            } catch (err) {
                alert("Erro ao excluir. Verifique se não há produtos usando essa categoria!")
            }
        }
    }

    return (
        <Card>
            <CardHeader><CardTitle className="text-base">Categorias</CardTitle></CardHeader>
            <CardContent>
                {loading ? (
                    <p className="text-sm text-neutral-500">Carregando...</p>
                ) : categories.length === 0 ? (
                    <p className="text-sm text-natural-500">Nenhuma categoria cadastrada!</p>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nome</TableHead>
                                <TableHead className="text-right"> Ações </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {categories.map(cat => (
                                <TableRow key={cat.id}>
                                    <TableCell>{cat.name}</TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            {/* Botão de Editar */}
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => onEdit(cat)}
                                                className="hover:bg-neutral-100 text-neutral-700 hover:text-black"
                                                title="Editar Categoria"
                                            >
                                                <i className="fas fa-edit text-sm" />
                                            </Button>

                                            {/* Botão de Excluir */}
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleDelete(cat.id)}
                                                className="hover:bg-red-50 text-red-600 hover:text-red-700"
                                                title="Excluir Categoria"
                                            >
                                                <i className="fas fa-trash text-sm" />
                                            </Button>
                                        </div>
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