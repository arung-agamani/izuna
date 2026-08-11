import { useRef } from "react";
import { Link } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import api from "../../lib/api";

gsap.registerPlugin(useGSAP);

interface BotInfo {
    id: string;
    username: string;
    discriminator: string;
    avatarUrl: string;
    guildCount: number;
    userCount: number;
    uptimeMs: number;
    uptimeHuman: string;
    pingMs: number;
    startedAt: string;
}

interface BotResponse {
    data: BotInfo;
}

function StatCard({ label, value, sub, to }: { label: string; value: string; sub?: string; to?: string }) {
    const inner = (
        <>
            <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--color-text-muted)" }}>
                {label}
            </p>
            <p className="text-2xl m-0" style={{ fontFamily: "var(--font-display)", color: to ? "var(--color-accent)" : "var(--color-text-primary)" }}>
                {value}
            </p>
            {sub && (
                <p className="text-xs mt-1 m-0" style={{ color: "var(--color-text-muted)" }}>
                    {sub}
                </p>
            )}
        </>
    );

    const className = "rounded-2xl p-5 block no-underline transition-all duration-200 hover:-translate-y-0.5";
    const style = { background: "var(--color-surface)", border: "1px solid var(--color-border)" };

    if (to) {
        return (
            <Link to={to} className={className} style={style}>
                {inner}
            </Link>
        );
    }

    return (
        <div className={className} style={style}>
            {inner}
        </div>
    );
}

export default function AdminOverview() {
    const containerRef = useRef<HTMLDivElement>(null);

    const { data, isLoading, error } = useQuery({
        queryKey: ["admin-bot"],
        queryFn: async () => {
            const res = await api.get("api/izuna/admin/bot").json<BotResponse>();
            return res.data;
        },
        retry: false,
    });

    useGSAP(
        () => {
            gsap.from(".admin-card", { opacity: 0, y: 20, stagger: 0.08, duration: 0.5, ease: "power3.out" });
        },
        { dependencies: [] },
    );

    const bot = data;

    return (
        <div ref={containerRef} className="mx-auto py-8 px-4">
            <h1 className="text-2xl mb-6" style={{ fontFamily: "var(--font-display)" }}>
                Admin Overview
            </h1>
            {isLoading && (
                <div className="text-center py-16" style={{ color: "var(--color-text-muted)" }}>
                    Loading bot info...
                </div>
            )}

            {error && (
                <div
                    className="admin-card rounded-2xl p-6 text-center"
                    style={{ background: "rgba(233,69,96,0.1)", border: "1px solid rgba(233,69,96,0.2)" }}
                >
                    <p className="text-sm m-0" style={{ color: "var(--color-accent)" }}>
                        {error instanceof Error && error.message.includes("403")
                            ? "Access denied — your Discord user ID is not in the admin whitelist."
                            : "Failed to load bot info. Is the bot running?"}
                    </p>
                </div>
            )}

            {bot && (
                <>
                    {/* Bot profile card */}
                    <div
                        className="admin-card rounded-2xl p-6 mb-6 flex items-center gap-5"
                        style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
                    >
                        {bot.avatarUrl ? (
                            <img src={bot.avatarUrl} alt={bot.username} className="w-20 h-20 rounded-full" />
                        ) : (
                            <div
                                className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold shrink-0"
                                style={{ background: "var(--color-accent-glow)", color: "var(--color-accent)" }}
                            >
                                {bot.username.charAt(0)}
                            </div>
                        )}
                        <div>
                            <h2 className="text-xl m-0" style={{ fontFamily: "var(--font-display)" }}>
                                {bot.username}
                                <span className="text-sm ml-1 font-normal" style={{ color: "var(--color-text-muted)" }}>
                                    #{bot.discriminator}
                                </span>
                            </h2>
                            <p className="text-xs m-0 mt-1 font-mono" style={{ color: "var(--color-text-muted)" }}>
                                ID: {bot.id}
                            </p>
                            <div className="flex items-center gap-3 mt-2">
                                <span
                                    style={{ background: "rgba(0,210,160,0.1)", color: "var(--color-positive)" }}
                                >
                                    <span className="w-2 h-2 rounded-full inline-block" style={{ background: "var(--color-positive)" }} />
                                    Online
                                </span>
                                <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
                                    {bot.pingMs}ms ping
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Stats grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                        <div className="admin-card">
                            <StatCard label="Guilds" value={String(bot.guildCount)} to="/dash/admin/guilds" />
                        </div>
                        <div className="admin-card">
                            <StatCard label="Users" value={bot.userCount.toLocaleString()} />
                        </div>
                        <div className="admin-card">
                            <StatCard label="Uptime" value={bot.uptimeHuman} />
                        </div>
                        <div className="admin-card">
                            <StatCard label="Started" value={new Date(bot.startedAt).toLocaleDateString()} sub={new Date(bot.startedAt).toLocaleTimeString()} />
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
