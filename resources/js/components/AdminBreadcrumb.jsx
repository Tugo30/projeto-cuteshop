import { Link } from "react-router-dom" // só se você usa react-router; senão use <a>

export default function AdminBreadcrumb({ items = [] }) {
    return (
        <nav className="mb-4 flex items-center gap-2 text-[11px] uppercase tracking-wider text-gray-400">
            <a href="/admin/dashboard" className="hover:text-ink transition-colors">Painel</a>
            {items.map((item, i) => (
                <span key={i} className="flex items-center gap-2">
                    <span className="text-gray-300">/</span>
                    {item.href ? (
                        <a href={item.href} className="hover:text-ink transition-colors">{item.label}</a>
                    ) : (
                        <span className="text-ink">{item.label}</span>
                    )}
                </span>
            ))}
        </nav>
    )
}
