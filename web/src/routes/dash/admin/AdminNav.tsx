import { Link, useLocation } from "react-router";

const tabs = [
    { to: "/dash/admin", label: "Overview", exact: true },
    { to: "/dash/admin/guilds", label: "Guilds", exact: false },
    { to: "/dash/admin/lavalink", label: "Lavalink", exact: false },
];

export default function AdminNav() {
    const { pathname } = useLocation();

    return (
        <div className="flex flex-wrap items-center gap-2 mb-6">
            {tabs.map((tab) => {
                const active = tab.exact ? pathname === tab.to : pathname.startsWith(tab.to);
                return (
                    <Link
                        key={tab.to}
                        to={tab.to}
                        className="no-underline px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200"
                        style={{
                            color: active ? "var(--color-accent)" : "var(--color-text-secondary)",
                            background: active ? "var(--color-accent-glow)" : "transparent",
                            border: `1px solid ${active ? "var(--color-accent)" : "var(--color-border)"}`,
                        }}
                    >
                        {tab.label}
                    </Link>
                );
            })}
        </div>
    );
}
