import { useRef, useState, useEffect } from "react";
import type { CSSProperties } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import api from "../../lib/api";
import AdminNav from "./AdminNav";

gsap.registerPlugin(useGSAP);

interface LavalinkNode {
    name: string;
    group: string | null;
    state: string;
    connected: boolean;
    penalties: number;
    tags: string[];
    lastError: string | null;
}

interface LavalinkPreferences {
    sourceTags: Record<string, string[]>;
    nodeTags: Record<string, string[]>;
}

interface NodesResponse {
    data: LavalinkNode[];
    count: number;
}

interface PreferencesResponse {
    data: LavalinkPreferences;
}

const primaryButtonStyle: CSSProperties = {
    background: "var(--color-accent)",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    padding: "8px 16px",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
};

const secondaryButtonStyle: CSSProperties = {
    background: "transparent",
    color: "var(--color-accent)",
    border: "1px solid var(--color-accent)",
    borderRadius: 8,
    padding: "8px 16px",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
};

const removeButtonStyle: CSSProperties = {
    background: "transparent",
    color: "var(--color-text-muted)",
    border: "1px solid var(--color-border)",
    borderRadius: 8,
    padding: "6px 10px",
    fontSize: 16,
    lineHeight: 1,
    cursor: "pointer",
};

const buttonInteraction = "transition-all duration-200 hover:opacity-90 active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed";

function parseTags(raw: string): string[] {
    return raw.split(/[,\s]+/).map((s) => s.trim()).filter(Boolean);
}

const toText = (map: Record<string, string[]>): Record<string, string> =>
    Object.fromEntries(Object.entries(map).map(([k, v]) => [k, v.join(", ")]));

const toTags = (map: Record<string, string>): Record<string, string[]> =>
    Object.fromEntries(Object.entries(map).map(([k, v]) => [k, parseTags(v)]));

function stateInfo(node: LavalinkNode): { label: string; color: string } {
    switch (node.state) {
        case "connected":
            return { label: "Connected", color: "var(--color-positive)" };
        case "connecting":
            return { label: "Connecting…", color: "var(--color-warning)" };
        case "disconnecting":
            return { label: "Disconnecting…", color: "var(--color-warning)" };
        default:
            return { label: "Offline", color: "var(--color-text-muted)" };
    }
}

function NodeCard({ node }: { node: LavalinkNode }) {
    const groupLabel = node.group === "public" ? "Public" : (node.group ?? "Local");
    const groupColor = node.group === "public" ? "var(--color-accent)" : "var(--color-gold)";
    const groupBackground = node.group === "public" ? "var(--color-accent-glow)" : "var(--color-gold-dim)";
    const state = stateInfo(node);

    return (
        <div className="lavalink-card rounded-2xl p-4" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
            <div className="flex items-center justify-between gap-2 mb-3">
                <h3 className="text-sm font-semibold truncate m-0" style={{ color: "var(--color-text-primary)" }} title={node.name}>
                    {node.name}
                </h3>
                <span className="text-xs px-2 py-0.5 rounded-full shrink-0" style={{ background: groupBackground, color: groupColor }}>
                    {groupLabel}
                </span>
            </div>

            <div className="flex items-center gap-3 mb-3">
                <span className="text-xs flex items-center gap-1.5" style={{ color: state.color }}>
                    <span className="w-2 h-2 rounded-full inline-block" style={{ background: state.color }} />
                    {state.label}
                </span>
                <span className="text-xs font-mono" style={{ color: "var(--color-text-muted)" }}>
                    {node.penalties} {node.penalties === 1 ? "penalty" : "penalties"}
                </span>
            </div>

            {node.lastError && (
                <p className="text-xs m-0 mb-3" style={{ color: "var(--color-text-muted)" }} title={node.lastError}>
                    {node.lastError}
                </p>
            )}

            <div className="flex flex-wrap gap-1.5">
                {node.tags.length === 0 && (
                    <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                        No tags
                    </span>
                )}
                {node.tags.map((tag) => (
                    <span
                        key={tag}
                        className="text-xs px-2 py-0.5 rounded-md"
                        style={{ background: "rgba(255,255,255,0.05)", color: "var(--color-text-secondary)" }}
                    >
                        {tag}
                    </span>
                ))}
            </div>
        </div>
    );
}

function TagsMapEditor({
    value,
    onChange,
    addLabel,
    keyHint,
}: {
    value: Record<string, string>;
    onChange: (next: Record<string, string>) => void;
    addLabel: string;
    keyHint: string;
}) {
    const [newKey, setNewKey] = useState("");
    const keys = Object.keys(value);

    const setValue = (key: string, raw: string) => onChange({ ...value, [key]: raw });

    const removeKey = (key: string) => {
        const next = { ...value };
        delete next[key];
        onChange(next);
    };

    const addKey = () => {
        const key = newKey.trim();
        if (!key || key in value) return;
        onChange({ ...value, [key]: "" });
        setNewKey("");
    };

    return (
        <div className="space-y-2">
            {keys.length === 0 && (
                <p className="text-sm m-0" style={{ color: "var(--color-text-muted)" }}>
                    No entries yet — add one below.
                </p>
            )}
            {keys.map((key) => (
                <div key={key} className="flex items-center gap-2">
                    <span className="w-28 shrink-0 text-xs font-mono truncate" title={key} style={{ color: "var(--color-text-secondary)" }}>
                        {key}
                    </span>
                    <input
                        className="field-input flex-1 min-w-0"
                        value={value[key]}
                        onChange={(e) => setValue(key, e.target.value)}
                        placeholder="tag1, tag2"
                        aria-label={`Tags for ${key}`}
                    />
                    <button type="button" onClick={() => removeKey(key)} style={removeButtonStyle} aria-label={`Remove ${key}`}>
                        &times;
                    </button>
                </div>
            ))}
            <div className="flex items-center gap-2">
                <input
                    className="field-input w-40"
                    value={newKey}
                    onChange={(e) => setNewKey(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") {
                            e.preventDefault();
                            addKey();
                        }
                    }}
                    placeholder={keyHint}
                    aria-label="New key"
                />
                <button type="button" onClick={addKey} className={buttonInteraction} style={secondaryButtonStyle}>
                    {addLabel}
                </button>
            </div>
        </div>
    );
}

export default function AdminLavalink() {
    const containerRef = useRef<HTMLDivElement>(null);
    const queryClient = useQueryClient();
    const initialized = useRef(false);
    const [sourceTagsText, setSourceTagsText] = useState<Record<string, string>>({});
    const [nodeTagsText, setNodeTagsText] = useState<Record<string, string>>({});
    const [feedback, setFeedback] = useState<{ kind: "success" | "error"; message: string } | null>(null);

    const { data: nodes, isLoading: nodesLoading, error: nodesError } = useQuery({
        queryKey: ["admin-lavalink-nodes"],
        queryFn: async () => (await api.get("api/izuna/admin/lavalink/nodes").json<NodesResponse>()).data,
        retry: false,
    });

    const { data: prefs, isLoading: prefsLoading, error: prefsError } = useQuery({
        queryKey: ["admin-lavalink-preferences"],
        queryFn: async () => (await api.get("api/izuna/admin/lavalink/preferences").json<PreferencesResponse>()).data,
        retry: false,
    });

    useEffect(() => {
        if (prefs && !initialized.current) {
            setSourceTagsText(toText(prefs.sourceTags));
            setNodeTagsText(toText(prefs.nodeTags));
            initialized.current = true;
        }
    }, [prefs]);

    useGSAP(
        () => {
            gsap.from(".lavalink-card", { opacity: 0, y: 20, stagger: 0.06, duration: 0.5, ease: "power3.out" });
        },
        { dependencies: [] },
    );

    const saveMutation = useMutation({
        mutationFn: async (body: Partial<LavalinkPreferences>) =>
            (await api.put("api/izuna/admin/lavalink/preferences", { json: body }).json<PreferencesResponse>()).data,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin-lavalink-preferences"] });
            setFeedback({ kind: "success", message: "Preferences saved — node resolution updated live." });
        },
        onError: (err) => {
            setFeedback({ kind: "error", message: err instanceof Error ? err.message : "Failed to save preferences." });
        },
    });

    const syncMutation = useMutation({
        mutationFn: async () => api.post("api/izuna/admin/lavalink/sync"),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin-lavalink-nodes"] });
            queryClient.invalidateQueries({ queryKey: ["admin-lavalink-preferences"] });
            setFeedback({ kind: "success", message: "Public node pool re-synced." });
        },
        onError: (err) => {
            setFeedback({ kind: "error", message: err instanceof Error ? err.message : "Failed to sync nodes." });
        },
    });

    const handleSave = () => {
        saveMutation.mutate({
            sourceTags: toTags(sourceTagsText),
            nodeTags: toTags(nodeTagsText),
        });
    };

    const isLoading = nodesLoading || prefsLoading;
    const queryError = nodesError ?? prefsError;

    return (
        <div ref={containerRef} className="mx-auto py-8 px-4">
            <h1 className="text-2xl mb-4" style={{ fontFamily: "var(--font-display)" }}>
                Lavalink
            </h1>
            <AdminNav />

            {isLoading && (
                <div className="text-center py-16" style={{ color: "var(--color-text-muted)" }}>
                    Loading Lavalink status...
                </div>
            )}

            {!isLoading && (nodesError || prefsError) && (
                <div className="rounded-2xl p-6 text-center" style={{ background: "rgba(233,69,96,0.1)", border: "1px solid rgba(233,69,96,0.2)" }}>
                    <p className="text-sm m-0" style={{ color: "var(--color-accent)" }}>
                        {queryError instanceof Error && queryError.message.includes("403")
                            ? "Access denied — your Discord user ID is not in the admin whitelist."
                            : "Failed to load Lavalink status."}
                    </p>
                </div>
            )}

            {!isLoading && !nodesError && !prefsError && (
                <>
                    {/* Node pool */}
                    <section className="mb-8">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg m-0" style={{ fontFamily: "var(--font-display)" }}>
                                Node Pool
                                <span className="ml-2 text-sm font-normal" style={{ color: "var(--color-text-muted)" }}>
                                    ({nodes?.length ?? 0})
                                </span>
                            </h2>
                            <button
                                type="button"
                                onClick={() => syncMutation.mutate()}
                                disabled={syncMutation.isPending}
                                className={buttonInteraction}
                                style={secondaryButtonStyle}
                            >
                                {syncMutation.isPending ? "Syncing..." : "Sync public nodes"}
                            </button>
                        </div>

                        {nodes && nodes.length === 0 ? (
                            <div className="text-center py-12 rounded-2xl" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
                                <p className="text-4xl mb-4">🎧</p>
                                <p className="text-sm m-0" style={{ color: "var(--color-text-secondary)" }}>
                                    No nodes in the pool. Start the bot to connect Lavalink nodes.
                                </p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {nodes?.map((node) => (
                                    <NodeCard key={node.name} node={node} />
                                ))}
                            </div>
                        )}
                    </section>

                    {/* Source preferences */}
                    <section className="lavalink-card rounded-2xl p-6 mb-6" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
                        <h2 className="text-lg m-0 mb-1" style={{ fontFamily: "var(--font-display)" }}>
                            Source preferences
                        </h2>
                        <p className="text-xs m-0 mb-4" style={{ color: "var(--color-text-muted)" }}>
                            Which node tags each source prefers, in priority order — <code>youtube → public</code>,{" "}
                            <code>http → local, public</code>.
                        </p>
                        <TagsMapEditor value={sourceTagsText} onChange={setSourceTagsText} addLabel="Add source" keyHint="e.g. spotify" />
                    </section>

                    {/* Node tags */}
                    <section className="lavalink-card rounded-2xl p-6 mb-6" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
                        <h2 className="text-lg m-0 mb-1" style={{ fontFamily: "var(--font-display)" }}>
                            Node tags
                        </h2>
                        <p className="text-xs m-0 mb-4" style={{ color: "var(--color-text-muted)" }}>
                            Override a node's tags by its exact name. An empty entry falls back to <code>local</code>/<code>public</code>.
                        </p>
                        <TagsMapEditor value={nodeTagsText} onChange={setNodeTagsText} addLabel="Add node" keyHint="e.g. local" />
                    </section>

                    {/* Save */}
                    <div className="flex items-center gap-4">
                        <button type="button" onClick={handleSave} disabled={saveMutation.isPending} className={buttonInteraction} style={primaryButtonStyle}>
                            {saveMutation.isPending ? "Saving..." : "Save preferences"}
                        </button>
                        {feedback && (
                            <span className="text-sm" style={{ color: feedback.kind === "success" ? "var(--color-positive)" : "var(--color-accent)" }}>
                                {feedback.kind === "success" ? "✓ " : "✗ "}
                                {feedback.message}
                            </span>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
