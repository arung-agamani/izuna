import { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import api from "../../lib/api";
import AdminNav from "./AdminNav";

gsap.registerPlugin(useGSAP);

interface AdminGuild {
    id: string;
    name: string;
    icon: string;
    description: string;
    memberCount: number;
    presenceCount: number;
    ownerId: string;
    joinedAt: string;
    preferredLocale: string;
    verificationLevel: string;
    explicitContentFilter: string;
    nsfwLevel: string;
    permissions: number;
    permissionsList: string[];
}

interface GuildsResponse {
    data: AdminGuild[];
    count: number;
}

function GuildCard({ guild }: { guild: AdminGuild }) {
    const [expanded, setExpanded] = useState(false);
    const hasAdmin = guild.permissionsList.includes("Administrator");

    return (
        <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="w-full text-left rounded-2xl overflow-hidden transition-all duration-300 group cursor-pointer"
            style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
            onMouseEnter={(e) => {
                gsap.to(e.currentTarget, { borderColor: "var(--color-accent-glow)", y: -2, duration: 0.25, ease: "power2.out" });
            }}
            onMouseLeave={(e) => {
                gsap.to(e.currentTarget, { borderColor: "var(--color-border)", y: 0, duration: 0.25, ease: "power2.out" });
            }}
        >
            <div className="p-4">
                {/* Header */}
                <div className="flex items-center gap-3">
                    {guild.icon ? (
                        <img src={guild.icon} alt={guild.name} className="w-10 h-10 rounded-xl shrink-0" />
                    ) : (
                        <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold shrink-0"
                            style={{ background: "var(--color-navy-700)", color: "var(--color-text-muted)" }}
                        >
                            {guild.name.charAt(0)}
                        </div>
                    )}
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                            <h3 className="text-sm font-semibold truncate m-0" style={{ color: "var(--color-text-primary)" }}>
                                {guild.name}
                            </h3>
                            {hasAdmin && (
                                <span className="text-xs px-1.5 py-0.5 rounded shrink-0" style={{ background: "var(--color-accent-glow)", color: "var(--color-accent)" }}>
                                    Admin
                                </span>
                            )}
                        </div>
                        <p className="text-xs m-0 mt-0.5 font-mono" style={{ color: "var(--color-text-muted)" }}>
                            {guild.id}
                        </p>
                    </div>
                    {/* Expand chevron */}
                    <span
                        className="text-xs shrink-0 transition-transform duration-300"
                        style={{
                            color: "var(--color-text-muted)",
                            transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
                        }}
                    >
                        &#9660;
                    </span>
                </div>

                {/* Quick stats */}
                <div className="flex items-center gap-4 mt-3">
                    <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
                        {guild.memberCount.toLocaleString()} members
                    </span>
                    {guild.presenceCount > 0 && (
                        <span className="text-xs" style={{ color: "var(--color-positive)" }}>
                            {guild.presenceCount.toLocaleString()} online
                        </span>
                    )}
                    <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                        Joined {new Date(guild.joinedAt).toLocaleDateString()}
                    </span>
                </div>

                {/* Expanded detail */}
                {expanded && (
                    <div className="mt-3 pt-3" style={{ borderTop: "1px solid var(--color-border)" }}>
                        {guild.description && (
                            <p className="text-xs leading-relaxed mb-3" style={{ color: "var(--color-text-secondary)" }}>
                                {guild.description}
                            </p>
                        )}
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mb-3">
                            <div>
                                <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>Locale </span>
                                <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>{guild.preferredLocale}</span>
                            </div>
                            <div>
                                <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>Verification </span>
                                <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>{guild.verificationLevel}</span>
                            </div>
                            <div>
                                <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>Content Filter </span>
                                <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>{guild.explicitContentFilter}</span>
                            </div>
                            <div>
                                <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>NSFW </span>
                                <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>{guild.nsfwLevel}</span>
                            </div>
                        </div>

                        <p className="text-xs font-semibold mb-2" style={{ color: "var(--color-text-muted)" }}>
                            Bot Permissions ({guild.permissionsList.length})
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                            {guild.permissionsList.map((perm) => (
                                <span
                                    key={perm}
                                    className="text-xs px-2 py-0.5 rounded-md"
                                    style={{
                                        background: perm === "Administrator" ? "var(--color-accent-glow)" : "rgba(255,255,255,0.05)",
                                        color: perm === "Administrator" ? "var(--color-accent)" : "var(--color-text-secondary)",
                                    }}
                                >
                                    {perm}
                                </span>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </button>
    );
}

export default function AdminGuilds() {
    const containerRef = useRef<HTMLDivElement>(null);

    const { data, isLoading, error } = useQuery({
        queryKey: ["admin-guilds"],
        queryFn: async () => {
            const res = await api.get("api/izuna/admin/guilds").json<GuildsResponse>();
            return res.data;
        },
        retry: false,
    });

    useGSAP(
        () => {
            gsap.from(".guild-card-wrapper", { opacity: 0, y: 20, stagger: 0.06, duration: 0.5, ease: "power3.out" });
        },
        { dependencies: [] },
    );

    const guilds = data ?? [];

    return (
        <div ref={containerRef} className="mx-auto py-8 px-4">
            <div className="flex items-center justify-between mb-4">
                <h1 className="text-2xl m-0" style={{ fontFamily: "var(--font-display)" }}>
                    Guilds
                    {!isLoading && (
                        <span className="ml-2 text-sm font-normal" style={{ color: "var(--color-text-muted)" }}>
                            ({guilds.length})
                        </span>
                    )}
                </h1>
            </div>
            <AdminNav />

            {isLoading && (
                <div className="text-center py-16" style={{ color: "var(--color-text-muted)" }}>
                    Loading guilds...
                </div>
            )}

            {error && (
                <div
                    className="rounded-2xl p-6 text-center"
                    style={{ background: "rgba(233,69,96,0.1)", border: "1px solid rgba(233,69,96,0.2)" }}
                >
                    <p className="text-sm m-0" style={{ color: "var(--color-accent)" }}>
                        {error instanceof Error && error.message.includes("403")
                            ? "Access denied — your Discord user ID is not in the admin whitelist."
                            : "Failed to load guilds."}
                    </p>
                </div>
            )}

            {!isLoading && !error && guilds.length === 0 && (
                <div className="text-center py-16">
                    <p className="text-4xl mb-4">🏰</p>
                    <h2 className="text-xl mb-2" style={{ fontFamily: "var(--font-display)" }}>
                        No guilds
                    </h2>
                    <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
                        The bot hasn't joined any servers yet.
                    </p>
                </div>
            )}

            {guilds.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {guilds.map((g) => (
                        <div key={g.id} className="guild-card-wrapper">
                            <GuildCard guild={g} />
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
