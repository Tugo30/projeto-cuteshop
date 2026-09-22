import { ShoppingBag, Package, PackageCheck, Truck, Bike, Home, ChevronsRight } from "lucide-react"

const ICONS = {
    received: ShoppingBag,
    preparing: Package,
    ready: PackageCheck,
    in_transit: Truck,
    out: Bike,
    delivered: Home,
}

function formatLastUpdate(progress) {
    const dates = progress.steps.map(s => s.at).filter(Boolean)
    if (dates.length === 0) return null

    const last = new Date(dates[dates.length - 1])
    const hora = last.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
    const data = last.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })

    return `${hora}, ${data.charAt(0).toUpperCase() + data.slice(1)}`
}

export default function OrderTimeline({ progress }) {
    if (!progress?.steps?.length) return null

    const lastUpdate = formatLastUpdate(progress)

    return (
        <div className="w-full bg-surface border border-border rounded p-6 sm:p-10">
            <div className="flex items-start justify-between gap-1 sm:gap-2">
                {progress.steps.map((step, index) => {
                    const Icon = ICONS[step.key] ?? Package
                    const active = step.state === "done" || step.state === "current"
                    const next = progress.steps[index + 1]
                    const connectorOn = next && (next.state === "done" || next.state === "current")

                    return (
                        <div key={step.key} className="flex items-center flex-1 last:flex-none">
                            <div className="flex flex-col items-center gap-2 min-w-[64px]">
                                <div
                                    className={
                                        "w-11 h-11 rounded-full flex items-center justify-center text-white " +
                                        (active ? "bg-primary" : "bg-gray-400")
                                    }
                                >
                                    <Icon size={20} strokeWidth={1.8} />
                                </div>
                                <span
                                    className={
                                        "text-[11px] sm:text-xs text-center leading-tight " +
                                        (active ? "text-primary font-medium" : "text-gray-500")
                                    }
                                >
                                    {step.label}
                                </span>
                            </div>

                            {next && (
                                <ChevronsRight
                                    className={"mb-5 mx-0.5 sm:mx-1 shrink-0 " + (connectorOn ? "text-primary" : "text-gray-300")}
                                    size={20}
                                />
                            )}
                        </div>
                    )
                })}
            </div>

            {lastUpdate && (
                <p className="text-center text-xs text-gray-500 mt-8">
                    Última atualização: {lastUpdate}
                </p>
            )}
        </div>
    )
}
