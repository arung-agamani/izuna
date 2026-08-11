import { useState, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useGuilds } from "../../hooks/useGuilds";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import api from "../lib/api";

gsap.registerPlugin(useGSAP);

/* ── Types ─────────────────────────────────────────── */

interface Reminder {
    id: number;
    uid: string;
    message: string;
    cronString: string;
    guildId: string;
    channelId: string;
    channelType: "DM" | "CHANNEL";
}

interface RemindersResponse {
    data: Reminder[];
    count: number;
}

/* ── Cron field descriptions ───────────────────────── */

const MINUTE = /^(\*|[0-5]?\d)$/;
const HOUR = /^(\*|1?\d|2[0-3])$/;
const DOM = /^(\*|[1-2]?\d|3[01])$/;
const MONTH = /^(\*|1?\d)$/;
const DOW = /^(\*|[0-6])$/;

function validateCronField(value: string, field: string): string | null {
    const patterns: Record<string, RegExp> = { minute: MINUTE, hour: HOUR, dom: DOM, month: MONTH, dow: DOW };
    // Allow standard cron: single value, comma-separated, range, step
    const parts = value.split(",");
    for (const part of parts) {
        const stepParts = part.split("/");
        if (stepParts.length > 2) return null;
        const base = stepParts[0].trim();
        const rangeParts = base.split("-");
        for (const rp of rangeParts) {
            if (!patterns[field].test(rp.trim())) return null;
        }
    }
    return value;
}

function cronPreview(cron: string): string {
    if (cron === "* * * * *") return "Every minute";
    const [minute, hour, dom, month, dow] = cron.split(" ");
    if (minute === "*" && hour === "*" && dom === "*" && month === "*" && dow !== "*") {
        const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        return `Every ${days[parseInt(dow)]}`;
    }
    if (minute !== "*" && hour === "*" && dom === "*" && month === "*") {
        return `Every ${minute} minute(s) past the hour`;
    }
    if (hour !== "*" && dom === "*" && month === "*") {
        const h = hour === "*" ? "every hour" : `at ${hour.padStart(2, "0")}`;
        const m = minute === "*" ? "" : `:${minute.padStart(2, "0")}`;
        return `Daily ${h}${m}`;
    }
    return `${minute} ${hour} ${dom} ${month} ${dow}`;
}

/* ── ChronicleForm ─────────────────────────────────── */

function ReminderFormModal({
    open,
    editing,
    guilds,
    onClose,
}: {
    open: boolean;
    editing: Reminder | null;
    guilds: { guildId: string; name: string }[];
    onClose: () => void;
}) {
    const queryClient = useQueryClient();
    const [message, setMessage] = useState("");
    const [cronString, setCronString] = useState("* * * * *");
    const [channelType, setChannelType] = useState<"DM" | "CHANNEL">("DM");
    const [channelId, setChannelId] = useState("");
    const [guildId, setGuildId] = useState("");
    const [error, setError] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [cronValid, setCronValid] = useState(true);

    // Populate when editing
    useState(() => {
        if (editing) {
            setMessage(editing.message);
            setCronString(editing.cronString);
            setChannelType(editing.channelType);
            setChannelId(editing.channelId);
            setGuildId(editing.guildId || "");
        } else {
            setMessage("");
            setCronString("* * * * *");
            setChannelType("DM");
            setChannelId("");
            setGuildId("");
        }
    });

    const createMutation = useMutation({
        mutationFn: async (body: { message: string; cronString: string; channelType: string; channelId: string; guildId?: string }) => {
            return api.post("api/izuna/users/me/reminders", { json: body }).json<{ data: Reminder }>();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["reminders"] });
            onClose();
        },
        onError: async (err) => {
            const msg = err instanceof Error ? err.message : "Failed to create reminder";
            setError(msg);
        },
    });

    const updateMutation = useMutation({
        mutationFn: async (body: { id: number } & Partial<Reminder>) => {
            const { id, ...rest } = body;
            return api.patch(`api/izuna/users/me/reminders/${id}`, { json: rest }).json<{ data: Reminder }>();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["reminders"] });
            onClose();
        },
        onError: async (err) => {
            const msg = err instanceof Error ? err.message : "Failed to update reminder";
            setError(msg);
        },
    });

    const handleCronChange = useCallback((value: string) => {
        setCronString(value);
        const parts = value.trim().split(/\s+/);
        setCronValid(parts.length === 5);
    }, []);

    const handleSubmit = useCallback(async () => {
        setError("");
        if (!message.trim()) return setError("Message is required");
        if (!cronString.trim()) return setError("Cron string is required");
        if (!cronValid) return setError("Cron must have 5 fields: minute hour dom month dow");
        if (!channelId.trim()) return setError("Channel ID is required");
        if (channelType === "CHANNEL" && !guildId.trim()) return setError("Guild is required for CHANNEL type");

        setSubmitting(true);
        try {
            if (editing) {
                await updateMutation.mutateAsync({ id: editing.id, message, cronString, channelType, channelId, guildId: guildId || undefined });
            } else {
                await createMutation.mutateAsync({ message, cronString, channelType, channelId, guildId: guildId || undefined });
            }
        } finally {
            setSubmitting(false);
        }
    }, [message, cronString, channelType, channelId, guildId, cronValid, editing, createMutation, updateMutation]);

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }} />
            <div
                className="relative w-full max-w-md rounded-2xl p-6 max-h-[90vh] overflow-y-auto"
                style={{ background: "var(--color-navy-800)", border: "1px solid var(--color-border)" }}
                onClick={(e) => e.stopPropagation()}
            >
                <h2 className="text-lg mb-4" style={{ fontFamily: "var(--font-display)" }}>
                    {editing ? "Edit Reminder" : "Create Reminder"}
                </h2>

                {error && (
                    <div className="mb-4 px-3 py-2 rounded-lg text-sm" style={{ background: "rgba(233,69,96,0.1)", color: "var(--color-accent)", border: "1px solid rgba(233,69,96,0.2)" }}>
                        {error}
                    </div>
                )}

                <div className="space-y-4">
                    {/* Message */}
                    <div>
                        <label className="block text-xs font-semibold mb-1" style={{ color: "var(--color-text-muted)" }}>
                            Message
                        </label>
                        <textarea
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg text-sm outline-none resize-none"
                            style={{
                                background: "var(--color-surface)",
                                border: "1px solid var(--color-border)",
                                color: "var(--color-text-primary)",
                                minHeight: "80px",
                            }}
                            placeholder="Reminder message..."
                            autoFocus
                        />
                    </div>

                    {/* Cron string */}
                    <div>
                        <label className="block text-xs font-semibold mb-1" style={{ color: "var(--color-text-muted)" }}>
                            Cron Schedule
                        </label>
                        <input
                            value={cronString}
                            onChange={(e) => handleCronChange(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg text-sm font-mono outline-none"
                            style={{
                                background: "var(--color-surface)",
                                border: `1px solid ${cronValid ? "var(--color-border)" : "var(--color-accent)"}`,
                                color: "var(--color-text-primary)",
                            }}
                            placeholder="* * * * *"
                        />
                        <p className="text-xs mt-1" style={{ color: cronValid ? "var(--color-text-muted)" : "var(--color-accent)" }}>
                            {cronValid ? cronPreview(cronString) : "5 fields required: minute hour day-of-month month day-of-week"}
                        </p>
                    </div>

                    {/* Channel type */}
                    <div>
                        <label className="block text-xs font-semibold mb-1" style={{ color: "var(--color-text-muted)" }}>
                            Delivery
                        </label>
                        <div className="flex gap-2">
                            <button
                                onClick={() => { setChannelType("DM"); setGuildId(""); }}
                                className="px-4 py-2 rounded-xl text-sm font-semibold cursor-pointer transition-colors flex-1"
                                style={{
                                    background: channelType === "DM" ? "var(--color-accent)" : "var(--color-surface)",
                                    color: channelType === "DM" ? "#fff" : "var(--color-text-secondary)",
                                }}
                            >
                                DM
                            </button>
                            <button
                                onClick={() => setChannelType("CHANNEL")}
                                className="px-4 py-2 rounded-xl text-sm font-semibold cursor-pointer transition-colors flex-1"
                                style={{
                                    background: channelType === "CHANNEL" ? "var(--color-gold)" : "var(--color-surface)",
                                    color: channelType === "CHANNEL" ? "#0a0a1a" : "var(--color-text-secondary)",
                                }}
                            >
                                Channel
                            </button>
                        </div>
                    </div>

                    {/* Guild — only for CHANNEL */}
                    {channelType === "CHANNEL" && (
                        <div>
                            <label className="block text-xs font-semibold mb-1" style={{ color: "var(--color-text-muted)" }}>
                                Guild
                            </label>
                            <select
                                value={guildId}
                                onChange={(e) => setGuildId(e.target.value)}
                                className="w-full px-3 py-2 rounded-lg text-sm outline-none cursor-pointer"
                                style={{
                                    background: "var(--color-surface)",
                                    border: "1px solid var(--color-border)",
                                    color: "var(--color-text-primary)",
                                }}
                            >
                                <option value="">Select a guild...</option>
                                {guilds.map((g) => (
                                    <option key={g.guildId} value={g.guildId}>
                                        {g.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Channel ID */}
                    <div>
                        <label className="block text-xs font-semibold mb-1" style={{ color: "var(--color-text-muted)" }}>
                            Channel ID
                        </label>
                        <input
                            value={channelId}
                            onChange={(e) => setChannelId(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg text-sm font-mono outline-none"
                            style={{
                                background: "var(--color-surface)",
                                border: "1px solid var(--color-border)",
                                color: "var(--color-text-primary)",
                            }}
                            placeholder="Discord channel ID..."
                        />
                    </div>
                </div>

                <div className="flex gap-3 mt-6">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold cursor-pointer transition-colors"
                        style={{ background: "var(--color-surface-hover)", color: "var(--color-text-secondary)" }}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={submitting}
                        className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold cursor-pointer transition-all duration-200 disabled:opacity-50"
                        style={{ background: "var(--color-accent)", color: "#fff" }}
                    >
                        {submitting ? "Saving…" : editing ? "Save Changes" : "Create Reminder"}
                    </button>
                </div>
            </div>
        </div>
    );
}

/* ── Delete confirmation ───────────────────────────── */

function DeleteConfirmModal({ open, reminder, onClose }: { open: boolean; reminder: Reminder | null; onClose: () => void }) {
    const queryClient = useQueryClient();

    const deleteMutation = useMutation({
        mutationFn: async (id: number) => {
            return api.delete(`api/izuna/users/me/reminders/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["reminders"] });
            onClose();
        },
    });

    if (!open || !reminder) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }} />
            <div
                className="relative w-full max-w-sm rounded-2xl p-6"
                style={{ background: "var(--color-navy-800)", border: "1px solid var(--color-border)" }}
                onClick={(e) => e.stopPropagation()}
            >
                <h2 className="text-lg mb-2" style={{ fontFamily: "var(--font-display)" }}>
                    Delete Reminder
                </h2>
                <p className="text-sm mb-6" style={{ color: "var(--color-text-secondary)" }}>
                    Are you sure you want to delete this reminder? This action cannot be undone.
                </p>
                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold cursor-pointer transition-colors"
                        style={{ background: "var(--color-surface-hover)", color: "var(--color-text-secondary)" }}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => deleteMutation.mutate(reminder.id)}
                        disabled={deleteMutation.isPending}
                        className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold cursor-pointer transition-all duration-200 disabled:opacity-50"
                        style={{ background: "var(--color-accent)", color: "#fff" }}
                    >
                        {deleteMutation.isPending ? "Deleting…" : "Delete"}
                    </button>
                </div>
            </div>
        </div>
    );
}

/* ── Reminder Card ─────────────────────────────────── */

function ReminderCard({ reminder, onEdit, onDelete, guildName }: { reminder: Reminder; onEdit: (r: Reminder) => void; onDelete: (r: Reminder) => void; guildName: string }) {
    return (
        <div
            className="rounded-2xl p-5 group transition-all duration-300"
            style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
            onMouseEnter={(e) => {
                gsap.to(e.currentTarget, { borderColor: "var(--color-accent-glow)", y: -2, duration: 0.25, ease: "power2.out" });
            }}
            onMouseLeave={(e) => {
                gsap.to(e.currentTarget, { borderColor: "var(--color-border)", y: 0, duration: 0.25, ease: "power2.out" });
            }}
        >
            {/* Header */}
            <div className="flex items-center gap-2 mb-3">
                <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: reminder.channelType === "DM" ? "var(--color-accent-glow)" : "rgba(255,215,0,0.1)", color: reminder.channelType === "DM" ? "var(--color-accent)" : "var(--color-gold)" }}>
                    {reminder.channelType}
                </span>
                <span className="text-xs font-mono" style={{ color: "var(--color-text-muted)" }}>
                    #{reminder.id}
                </span>
            </div>

            {/* Message */}
            <p className="text-sm leading-relaxed mb-3" style={{ color: "var(--color-text-primary)" }}>
                {reminder.message}
            </p>

            {/* Schedule */}
            <div className="flex items-center gap-2 mb-2">
                <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>Schedule:</span>
                <code className="text-xs px-2 py-0.5 rounded-md font-mono" style={{ background: "rgba(255,255,255,0.05)", color: "var(--color-text-secondary)" }}>
                    {reminder.cronString}
                </code>
                <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                    — {cronPreview(reminder.cronString)}
                </span>
            </div>

            {/* Destination */}
            <div className="flex items-center gap-2 mb-3">
                <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>To:</span>
                {reminder.channelType === "DM" ? (
                    <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>Direct Message</span>
                ) : (
                    <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
                        {guildName || reminder.guildId} / {reminder.channelId}
                    </span>
                )}
            </div>

            {/* Actions */}
            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <button
                    onClick={() => onEdit(reminder)}
                    className="text-xs px-3 py-1 rounded-lg cursor-pointer transition-colors duration-150"
                    style={{ background: "var(--color-surface-hover)", color: "var(--color-text-secondary)" }}
                >
                    Edit
                </button>
                <button
                    onClick={() => onDelete(reminder)}
                    className="text-xs px-3 py-1 rounded-lg cursor-pointer transition-colors duration-150"
                    style={{ background: "rgba(233,69,96,0.1)", color: "var(--color-accent)" }}
                >
                    Delete
                </button>
            </div>
        </div>
    );
}

/* ── Page ──────────────────────────────────────────── */

export default function V2Reminders() {
    const [modal, setModal] = useState<{ type: "create" | "edit" | "delete" | null; reminder: Reminder | null }>({ type: null, reminder: null });
    const containerRef = useRef<HTMLDivElement>(null);

    const { data: reminders, isLoading } = useQuery({
        queryKey: ["reminders"],
        queryFn: async () => {
            const res = await api.get("api/izuna/users/me/reminders").json<RemindersResponse>();
            return res.data;
        },
    });

    const { data: guildsData } = useGuilds();
    const guilds = (guildsData?.guilds ?? []).map((g) => ({ guildId: g.guildId, name: g.name }));

    useGSAP(
        () => {
            gsap.from(".reminder-card-wrapper", {
                opacity: 0,
                y: 20,
                stagger: 0.06,
                duration: 0.5,
                ease: "power3.out",
            });
        },
        { dependencies: [] },
    );

    const list = reminders ?? [];

    return (
        <div ref={containerRef} className="max-w-5xl mx-auto py-8 px-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl m-0" style={{ fontFamily: "var(--font-display)" }}>
                        Reminders
                        {!isLoading && (
                            <span className="ml-2 text-sm font-normal" style={{ color: "var(--color-text-muted)" }}>
                                ({list.length})
                            </span>
                        )}
                    </h1>
                </div>
                <button
                    onClick={() => setModal({ type: "create", reminder: null })}
                    className="px-4 py-2 rounded-xl text-sm font-semibold cursor-pointer transition-all duration-200 hover:scale-105"
                    style={{ background: "var(--color-accent)", color: "#fff" }}
                >
                    + Create Reminder
                </button>
            </div>

            {/* Loading */}
            {isLoading && (
                <div className="text-center py-16" style={{ color: "var(--color-text-muted)" }}>
                    Loading reminders...
                </div>
            )}

            {/* Empty state */}
            {!isLoading && list.length === 0 && (
                <div className="text-center py-16">
                    <p className="text-4xl mb-4">⏰</p>
                    <h2 className="text-xl mb-2" style={{ fontFamily: "var(--font-display)" }}>
                        No reminders yet
                    </h2>
                    <p className="text-sm mb-6" style={{ color: "var(--color-text-secondary)" }}>
                        Schedule recurring messages delivered to your DMs or server channels.
                    </p>
                    <button
                        onClick={() => setModal({ type: "create", reminder: null })}
                        className="px-5 py-2.5 rounded-xl text-sm font-semibold cursor-pointer transition-all duration-200 hover:scale-105"
                        style={{ background: "var(--color-accent)", color: "#fff" }}
                    >
                        + Create Reminder
                    </button>
                </div>
            )}

            {/* Reminder grid */}
            {!isLoading && list.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {list.map((r) => (
                        <div key={r.id} className="reminder-card-wrapper">
                            <ReminderCard
                                reminder={r}
                                guildName={guilds.find((g) => g.guildId === r.guildId)?.name ?? ""}
                                onEdit={(reminder) => setModal({ type: "edit", reminder })}
                                onDelete={(reminder) => setModal({ type: "delete", reminder })}
                            />
                        </div>
                    ))}
                </div>
            )}

            {/* Modals */}
            <ReminderFormModal
                open={modal.type === "create" || modal.type === "edit"}
                editing={modal.type === "edit" ? modal.reminder : null}
                guilds={guilds}
                onClose={() => setModal({ type: null, reminder: null })}
            />
            <DeleteConfirmModal
                open={modal.type === "delete"}
                reminder={modal.reminder}
                onClose={() => setModal({ type: null, reminder: null })}
            />
        </div>
    );
}
