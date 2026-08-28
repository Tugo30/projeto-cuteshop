import ProductList from "./ProductList"
import ProductForm from "./ProductForm"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import ProductList from "./components/ProductList"
import ProductForm from "./components/ProductForm"
import { Plus } from "lucide-react"

export default function ProductsPage() {
    const [view, setView] = useState("list") // "list" | "form"
    const [editingProduct, setEditingProduct] = useState(null)
    const [refreshKey, setRefreshKey] = useState(0)

    const openNewProduct = () => {
        setEditingProduct(null)
        setView("form")
    }

    const openEditProduct = (product) => {
        setEditingProduct(product)
        setView("form")
    }

    const handleSaved = () => {
        setRefreshKey(k => k + 1)
        setView("list")
    }

    return (
        <div className="max-w-5xl mx-auto p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Gestão de Produtos</h1>
                    <p className="text-sm text-muted-foreground">
                        Cadastre produtos e seus estoques por tamanho
                    </p>
                </div>
                {view === "list" && (
                    <Button onClick={openNewProduct}>
                        <Plus className="mr-1 h-4 w-4" /> Novo Produto
                    </Button>
                )}
            </div>

            {view === "list" ? (
                <ProductList onEdit={openEditProduct} refreshKey={refreshKey} />
            ) : (
                <ProductForm
                    product={editingProduct}
                    onSaved={handleSaved}
                    onCancel={() => setView("list")}
                />
            )}
        </div>
    )
}