import { useRef } from "react";
import { useUser } from "../../hooks/useUser";
import { useGuilds } from "../../hooks/useGuilds";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

interface InfoRowProps {
    label: string;
    value: string;
    mono?: boolean;
}

function InfoRow({ label, value, mono }: InfoRowProps) {
    return (
        <div className="flex items-baseline gap-3 py-2 border-b" style={{ borderColor: "var(--color-border)" }}>
            <span className="text-sm w-28 shrink-0" style={{ color: "var(--color-text-muted)" }}>
                {label}
            </span>
            <span className={`text-sm ${mono ? "font-mono" : ""}`} style={{ color: "var(--color-text-primary)" }}>
                {value}
            </span>
        </div>
    );
}

function Avatar({ name }: { name: string }) {
    return (
        <div
            className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold shrink-0"
            style={{
                background: "var(--color-accent-glow)",
                color: "var(--color-accent)",
                fontFamily: "var(--font-display)",
            }}
        >
            {name.charAt(0).toUpperCase()}
        </div>
    );
}

function StatusDot({ online }: { online: boolean }) {
    return (
        <span
            className="inline-block w-2.5 h-2.5 rounded-full mr-1.5"
            style={{ background: online ? "var(--color-positive)" : "var(--color-text-muted)" }}
        />
    );
}

function GuildCard({ name, guildId, isAdmin }: { name: string; guildId: string; isAdmin: boolean }) {
    return (
        <div
            className="flex items-center gap-3 px-4 py-3 rounded-xl"
            style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
        >
            <div
                className="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold shrink-0"
                style={{
                    background: isAdmin ? "var(--color-accent-glow)" : "rgba(255,215,0,0.1)",
                    color: isAdmin ? "var(--color-accent)" : "var(--color-gold)",
                }}
            >
                {name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold truncate m-0" style={{ color: "var(--color-text-primary)" }}>
                    {name}
                </p>
                <p className="text-xs truncate m-0" style={{ color: "var(--color-text-muted)" }}>
                    {guildId}
                </p>
            </div>
            {isAdmin && (
                <span className="text-xs px-2 py-0.5 rounded-full shrink-0" style={{ background: "var(--color-accent-glow)", color: "var(--color-accent)" }}>
                    Admin
                </span>
            )}
        </div>
    );
}

export default function DashProfile() {
    const { data: user } = useUser();
    const { data: guildsData } = useGuilds();
    const containerRef = useRef<HTMLDivElement>(null);

    useGSAP(
        () => {
            gsap.from(".prof-section", {
                opacity: 0,
                y: 24,
                stagger: 0.1,
                duration: 0.6,
                ease: "power3.out",
            });
        },
        { scope: containerRef },
    );

    const createdDate = user?.createdAt
        ? new Date(user.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
        : "";

    const guilds = guildsData?.guilds ?? [];
    const adminGuilds = guilds.filter((g) => g.isAdmin);
    const memberGuilds = guilds.filter((g) => !g.isAdmin);

    if (!user) {
        return (
            <div className="py-16 text-center" style={{ color: "var(--color-text-muted)" }}>
                Loading profile...
            </div>
        );
    }

    return (
        <div ref={containerRef} className="mx-auto py-8 px-4 space-y-6">
            {/* User card */}
            <div
                className="prof-section rounded-2xl p-6"
                style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
            >
                <div className="flex items-center gap-4 mb-6">
                    <div>
                        <h1 className="text-2xl m-0" style={{ fontFamily: "var(--font-display)", color: "var(--color-text-primary)" }}>
                            {user.name}
                        </h1>
                        <p className="text-sm m-0 mt-1" style={{ color: "var(--color-text-secondary)" }}>
                            <StatusDot online /> Online
                        </p>
                    </div>
                </div>

                <div className="space-y-0">
                    <InfoRow label="Display Name" value={user.name} />
                    <InfoRow label="Email" value={user.email} />
                    <InfoRow label="User ID" value={user.uid} mono />
                    <InfoRow label="Login via" value={user.loginType ?? "Unknown"} />
                    <InfoRow label="Joined" value={createdDate} />
                </div>
            </div>

            {/* Guild membership */}
            <div
                className="prof-section rounded-2xl p-6"
                style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
            >
                <h2 className="text-lg m-0 mb-4" style={{ fontFamily: "var(--font-display)", color: "var(--color-text-primary)" }}>
                    Guild Memberships
                    <span className="ml-2 text-sm font-normal" style={{ color: "var(--color-text-muted)" }}>
                        ({guilds.length})
                    </span>
                </h2>

                {guilds.length === 0 ? (
                    <p className="text-sm m-0" style={{ color: "var(--color-text-muted)" }}>
                        Not a member of any guilds yet.
                    </p>
                ) : (
                    <div className="space-y-4">
                        {adminGuilds.length > 0 && (
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--color-text-muted)" }}>
                                    Admin ({adminGuilds.length})
                                </p>
                                <div className="space-y-2">
                                    {adminGuilds.map((g) => (
                                        <GuildCard key={g.guildId} name={g.name} guildId={g.guildId} isAdmin />
                                    ))}
                                </div>
                            </div>
                        )}
                        {memberGuilds.length > 0 && (
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--color-text-muted)" }}>
                                    Member ({memberGuilds.length})
                                </p>
                                <div className="space-y-2">
                                    {memberGuilds.map((g) => (
                                        <GuildCard key={g.guildId} name={g.name} guildId={g.guildId} isAdmin={false} />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
