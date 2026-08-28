import { useState } from "react"
import { Button } from "@/components/ui/button"
import CategoryList from "./CategoryList"
import CategoryForm from "./CategoryForm" // importado aqui

export default function CategoriesAdmin() {
    const [view, setView] = useState("list")
    const [editingCategory, setEditingCategory] = useState(null)
    const [refreshKey, setRefreshKey] = useState(0)

    function openNew() { setEditingCategory(null); setView("form")}
    function openEdit(cat) {setEditingCategory(cat); setView("form")}
    //'k => k + 1' garante que ele sempre some 1 ao valor anterior
    function handleSaved() {setRefreshKey(k => k + 1); setView("list")}

    return (
        <div style={{ fontFamily: "'DM Sans', sans-serif", maxWidth: "700px", margin: "0 auto", padding: "8px"}}>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 style={{ fontSize: "22px", fontWeight: "700", color: "#111", margin:" 0 auto", padding: "8px"}}>Categorias</h1>
                    <p style={{ color: "#888", fontSize: "13px", margin: "4px 0 0"}}>Gerencie as categorias de produtos</p>
                </div>
                {view === "list" && (
                    <Button onClick={openNew} className= "bg-black hover:bg-neutral-800 text-white">
                        + Nova Categoria
                    </Button>
                )}
            </div>
            {view === "list" ? (
                <CategoryList onEdit={openEdit} refreshKey={refreshKey}/>
            ) : (
                <CategoryForm category={editingCategory} onSaved={handleSaved} onCancel={() => setView("list")}/>
            )}
        </div>
    )
}