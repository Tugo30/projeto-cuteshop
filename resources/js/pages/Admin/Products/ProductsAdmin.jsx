import { useState } from "react"
import { Button } from "@/components/ui/button"
import ProductForm from "./ProductForm"
import ProductList from "./ProductList"

export default function ProductsAdmin() {
    const [view, setView] = useState("list") // "list" | "form"
    const [editingProduct, setEditingProduct] = useState(null)
    const [refreshKey, setRefreshKey] = useState(0)

    function openNewProduct() {
        setEditingProduct(null)
        setView("form")
    }

    function openEditProduct(product) {
        setEditingProduct(product)
        setView("form")
    }

    function handleSaved() {
        setRefreshKey(k => k + 1)
        setView("list")
    }

    return (
        <div style={{ fontFamily: "'DM Sans', sans-serif", maxWidth: "900px", margin: "0 auto", padding: "8px" }}>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 style={{ fontSize: "22px", fontWeight: "700", color: "#111", margin: 0 }}>
                        Gestão de Produtos
                    </h1>
                    <p style={{ color: "#888", fontSize: "13px", margin: "4px 0 0" }}>
                        Cadastre produtos e seus estoques por tamanho
                    </p>
                </div>
                {view === "list" && (
                    <Button onClick={openNewProduct} className="bg-black hover:bg-neutral-800 text-white">
                        + Novo Produto
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