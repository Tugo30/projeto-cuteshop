import { useState } from "react"
import axios from "axios"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const csrf = () => document.querySelector('meta[name="csrf-token"]')?.content

export default function Login() {
    const [username, setUsername] = useState("")
    const [password, setPassword] = useState("")
    const [loading, setLoading]   = useState(false)
    const [error, setError]       = useState("")

    async function handleSubmit(e) {
        e.preventDefault()
        if (!username.trim() || !password.trim()) {
            setError("Preencha todos os campos.")
            return
        }

        setLoading(true)
        setError("")

        try {
            await axios.post("/login", { username, password }, {
                headers: { "X-CSRF-TOKEN": csrf() }
            })
            window.location.href = "/"
        } catch (err) {
            if (err.response?.status === 422) {
                setError("Usuário ou senha inválidos.")
            } else {
                setError(err.response?.data?.invalid_login ?? "Erro ao realizar login.")
            }
        } finally {
            setLoading(false)
        }
    }

    return (
        <div style={{ fontFamily: "'DM Sans', sans-serif", maxWidth: "420px", margin: "40px auto", padding: "8px" }}>
            <Card className="shadow-sm">
                <CardHeader>
                    <CardTitle className="text-xl text-center font-bold">zLuz</CardTitle>
                    <p className="text-xs text-center text-gray-500 uppercase tracking-widest">Acessar Conta</p>
                </CardHeader>
                <CardContent>
                    {error && (
                        <div className="bg-red-100 text-red-800 border border-red-300 rounded px-4 py-2 text-sm mb-4 text-center">
                            {error}
                        </div>
                    )}
                    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                        <div>
                            <Label>Usuário</Label>
                            <Input
                                placeholder="Digite seu usuário"
                                value={username}
                                onChange={e => setUsername(e.target.value)}
                            />
                        </div>
                        <div>
                            <Label>Senha</Label>
                            <Input
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                            />
                        </div>
                        <Button type="submit" disabled={loading} className="text-white w-full mt-2">
                            {loading ? "Entrando..." : "Entrar"}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}