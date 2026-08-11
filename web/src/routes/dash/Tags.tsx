import { useState, useRef, useCallback, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createPortal } from "react-dom";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import api from "../lib/api";

gsap.registerPlugin(useGSAP);

/* ── Types ─────────────────────────────────────────── */

interface Tag {
    id: number;
    userId: string;
    guildId: string;
    name: string;
    dateCreated: string;
    message: string;
    isMedia: boolean;
    isGuild: boolean;
}

interface TagsResponse {
    data: Tag[];
    count: number;
}

/* ── Helpers ───────────────────────────────────────── */

function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 30) return `${days}d ago`;
    const months = Math.floor(days / 30);
    return `${months}mo ago`;
}

function truncate(str: string, n: number): string {
    return str.length > n ? str.slice(0, n) + "…" : str;
}

function getMediaType(url: string): "image" | "video" | null {
    const ext = url.split("?")[0].split(".").pop()?.toLowerCase();
    if (!ext) return null;
    if (["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp"].includes(ext)) return "image";
    if (["mp4", "webm", "mov", "ogv"].includes(ext)) return "video";
    return null;
}

/* ── Components ────────────────────────────────────── */

function EmptyState({ onAction }: { onAction: () => void }) {
    return (
        <div className="text-center py-16">
            <p className="text-4xl mb-4">🏷️</p>
            <h2 className="text-xl mb-2" style={{ fontFamily: "var(--font-display)" }}>
                No tags yet
            </h2>
            <p className="text-sm mb-6" style={{ color: "var(--color-text-secondary)" }}>
                Create your first tag to save messages, images, or reaction media.
            </p>
            <button
                onClick={onAction}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold cursor-pointer transition-all duration-200 hover:scale-105"
                style={{ background: "var(--color-accent)", color: "#fff" }}
            >
                + Create Tag
            </button>
        </div>
    );
}

function TagCard({
    tag,
    onEdit,
    onDelete,
    onView,
}: {
    tag: Tag;
    onEdit: (tag: Tag) => void;
    onDelete: (tag: Tag) => void;
    onView: (tag: Tag) => void;
}) {
    const mediaType = tag.isMedia ? getMediaType(tag.message) : null;

    return (
        <button
            type="button"
            onClick={() => onView(tag)}
            className="w-full h-full text-left rounded-2xl overflow-hidden transition-all duration-300 group cursor-pointer flex flex-col"
            style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
            onMouseEnter={(e) => {
                gsap.to(e.currentTarget, { borderColor: "var(--color-accent-glow)", y: -2, duration: 0.25, ease: "power2.out" });
            }}
            onMouseLeave={(e) => {
                gsap.to(e.currentTarget, { borderColor: "var(--color-border)", y: 0, duration: 0.25, ease: "power2.out" });
            }}
        >
            {/* Media preview */}
            {mediaType === "image" && (
                <div
                    className="aspect-video bg-cover bg-center shrink-0"
                    style={{ backgroundImage: `url(${tag.message})`, backgroundColor: "var(--color-navy-800)" }}
                />
            )}
            {mediaType === "video" && (
                <video
                    src={tag.message}
                    className="aspect-video w-full object-cover shrink-0"
                    style={{ backgroundColor: "var(--color-navy-800)" }}
                    muted
                    loop
                    playsInline
                    onMouseEnter={(e) => (e.currentTarget as HTMLVideoElement).play()}
                    onMouseLeave={(e) => { const v = e.currentTarget as HTMLVideoElement; v.pause(); v.currentTime = 0; }}
                />
            )}

            <div className="p-4 flex flex-col flex-1 min-h-0">
                {/* Header */}
                <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg font-medium truncate flex-1" style={{ fontFamily: "var(--font-display)", color: "var(--color-accent)" }}>
                        {tag.name}
                    </span>
                    <span
                        className="text-xs px-2 py-0.5 rounded-full shrink-0"
                        style={{
                            background: tag.isMedia ? "rgba(255,215,0,0.1)" : "rgba(0,210,160,0.1)",
                            color: tag.isMedia ? "var(--color-gold)" : "var(--color-positive)",
                        }}
                    >
                        {tag.isMedia ? "Media" : "Text"}
                    </span>
                    <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                        {timeAgo(tag.dateCreated)}
                    </span>
                </div>

                {/* Content — hidden for media, shown truncated for text */}
                {!tag.isMedia && (
                    <p className="text-sm m-0 leading-relaxed flex-1 overflow-hidden" style={{ color: "var(--color-text-secondary)" }}>
                        {truncate(tag.message, 120)}
                    </p>
                )}
                {tag.isMedia && (
                    <p className="text-xs m-0 leading-relaxed flex-1 overflow-hidden" style={{ color: "var(--color-text-muted)" }}>
                        Click to view
                    </p>
                )}

                {/* Actions — visible on hover */}
                <div className="flex gap-2 mt-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 shrink-0">
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            onEdit(tag);
                        }}
                        className="text-xs px-3 py-1 rounded-lg cursor-pointer transition-colors duration-150"
                        style={{ background: "var(--color-surface-hover)", color: "var(--color-text-secondary)" }}
                    >
                        Edit
                    </button>
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete(tag);
                        }}
                        className="text-xs px-3 py-1 rounded-lg cursor-pointer transition-colors duration-150"
                        style={{ background: "rgba(233,69,96,0.1)", color: "var(--color-accent)" }}
                    >
                        Delete
                    </button>
                </div>
            </div>
        </button>
    );
}

function TagDetailModal({ open, tag, onClose }: { open: boolean; tag: Tag | null; onClose: () => void }) {
    if (!open || !tag) return null;

    const mediaType = tag.isMedia ? getMediaType(tag.message) : null;

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }} />
            <div
                className="relative w-full max-w-2xl rounded-2xl overflow-hidden max-h-[90vh] flex flex-col"
                style={{ background: "var(--color-navy-800)", border: "1px solid var(--color-border)" }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Media */}
                {mediaType === "image" && (
                    <div className="shrink-0">
                        <img src={tag.message} alt={tag.name} className="w-full max-h-[50vh] object-contain" style={{ background: "var(--color-navy-900)" }} />
                    </div>
                )}
                {mediaType === "video" && (
                    <div className="shrink-0">
                        <video src={tag.message} controls className="w-full max-h-[50vh]" style={{ background: "var(--color-navy-900)" }} />
                    </div>
                )}

                <div className="p-6 overflow-y-auto">
                    {/* Header */}
                    <div className="flex items-center gap-3 mb-4">
                        <h2 className="text-2xl m-0" style={{ fontFamily: "var(--font-display)", color: "var(--color-accent)" }}>
                            {tag.name}
                        </h2>
                        <span
                            className="text-xs px-2 py-0.5 rounded-full"
                            style={{
                                background: tag.isMedia ? "rgba(255,215,0,0.1)" : "rgba(0,210,160,0.1)",
                                color: tag.isMedia ? "var(--color-gold)" : "var(--color-positive)",
                            }}
                        >
                            {tag.isMedia ? "Media" : "Text"}
                        </span>
                    </div>

                    {/* Meta */}
                    <div className="flex items-center gap-4 mb-6 text-xs" style={{ color: "var(--color-text-muted)" }}>
                        <span>Created {new Date(tag.dateCreated).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</span>
                        <span className="font-mono">ID: {tag.id}</span>
                    </div>

                    {/* Content */}
                    {!tag.isMedia && (
                        <div
                            className="text-sm leading-relaxed whitespace-pre-wrap rounded-xl p-4"
                            style={{ background: "var(--color-surface)", color: "var(--color-text-primary)", border: "1px solid var(--color-border)" }}
                        >
                            {tag.message}
                        </div>
                    )}
                    {tag.isMedia && (
                        <div className="text-xs font-mono break-all rounded-xl p-3" style={{ background: "var(--color-surface)", color: "var(--color-text-muted)", border: "1px solid var(--color-border)" }}>
                            {tag.message}
                        </div>
                    )}
                </div>
            </div>
        </div>,
        document.body,
    );
}

function TagFormModal({
    open,
    editing,
    onClose,
}: {
    open: boolean;
    editing: Tag | null;
    onClose: () => void;
}) {
    const queryClient = useQueryClient();
    const [name, setName] = useState("");
    const [content, setContent] = useState("");
    const [isMedia, setIsMedia] = useState(false);
    const [error, setError] = useState("");
    const [submitting, setSubmitting] = useState(false);

    // Populate form when editing
    useEffect(() => {
        if (editing) {
            setName(editing.name);
            setContent(editing.message);
            setIsMedia(editing.isMedia);
        } else {
            setName("");
            setContent("");
            setIsMedia(false);
        }
    }, [editing]);

    const createMutation = useMutation({
        mutationFn: async (body: { name: string; content: string; isMedia?: boolean }) => {
            return api.post("api/izuna/users/me/tags", { json: body }).json<{ data: Tag }>();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["tags"] });
            onClose();
        },
        onError: async (err) => {
            const msg = err instanceof Error ? err.message : "Failed to create tag";
            setError(msg);
        },
    });

    const updateMutation = useMutation({
        mutationFn: async (body: { id: number; content: string }) => {
            return api.patch(`api/izuna/users/me/tags/${body.id}`, { json: { content: body.content } }).json<{ data: Tag }>();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["tags"] });
            onClose();
        },
        onError: async (err) => {
            const msg = err instanceof Error ? err.message : "Failed to update tag";
            setError(msg);
        },
    });

    const handleSubmit = useCallback(async () => {
        setError("");
        if (!name.trim()) return setError("Name is required");
        if (!content.trim()) return setError("Content is required");
        if (!/^\w+$/.test(name)) return setError("Name must be a single alphanumeric word (no spaces or special characters)");
        if (content.length > 2000) return setError("Content is too large (max 2000 characters)");

        setSubmitting(true);
        try {
            if (editing) {
                await updateMutation.mutateAsync({ id: editing.id, content });
            } else {
                await createMutation.mutateAsync({ name, content, isMedia: isMedia || undefined });
            }
        } finally {
            setSubmitting(false);
        }
    }, [name, content, isMedia, editing, createMutation, updateMutation]);

    if (!open) return null;


    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }} />
            <div
                className="relative w-full max-w-md rounded-2xl p-6"
                style={{ background: "var(--color-navy-800)", border: "1px solid var(--color-border)" }}
                onClick={(e) => e.stopPropagation()}
            >
                <h2 className="text-lg mb-4" style={{ fontFamily: "var(--font-display)" }}>
                    {editing ? "Edit Tag" : "Create Tag"}
                </h2>

                {error && (
                    <div className="mb-4 px-3 py-2 rounded-lg text-sm" style={{ background: "rgba(233,69,96,0.1)", color: "var(--color-accent)", border: "1px solid rgba(233,69,96,0.2)" }}>
                        {error}
                    </div>
                )}

                <div className="space-y-4">
                    {!editing && (
                        <>
                            <div>
                                <label className="block text-xs font-semibold mb-1" style={{ color: "var(--color-text-muted)" }}>
                                    Tag Name
                                </label>
                                <div className="flex items-center gap-1">
                                    <span style={{ color: "var(--color-accent)" }}>!</span>
                                    <input
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="flex-1 px-3 py-2 rounded-lg text-sm outline-none"
                                        style={{
                                            background: "var(--color-surface)",
                                            border: "1px solid var(--color-border)",
                                            color: "var(--color-text-primary)",
                                        }}
                                        placeholder="tag_name"
                                        autoFocus
                                    />
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <label className="text-xs font-semibold" style={{ color: "var(--color-text-muted)" }}>
                                    Type:
                                </label>
                                <button
                                    onClick={() => setIsMedia(false)}
                                    className="text-xs px-3 py-1 rounded-full cursor-pointer transition-colors"
                                    style={{
                                        background: !isMedia ? "var(--color-accent)" : "var(--color-surface)",
                                        color: !isMedia ? "#fff" : "var(--color-text-secondary)",
                                    }}
                                >
                                    Text
                                </button>
                                <button
                                    onClick={() => setIsMedia(true)}
                                    className="text-xs px-3 py-1 rounded-full cursor-pointer transition-colors"
                                    style={{
                                        background: isMedia ? "var(--color-gold)" : "var(--color-surface)",
                                        color: isMedia ? "#0a0a1a" : "var(--color-text-secondary)",
                                    }}
                                >
                                    Media
                                </button>
                            </div>
                        </>
                    )}

                    <div>
                        <label className="block text-xs font-semibold mb-1" style={{ color: "var(--color-text-muted)" }}>
                            {editing ? "Content" : isMedia ? "Media URL" : "Message Content"}
                        </label>
                        <textarea
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg text-sm outline-none resize-none"
                            style={{
                                background: "var(--color-surface)",
                                border: "1px solid var(--color-border)",
                                color: "var(--color-text-primary)",
                                minHeight: "100px",
                            }}
                            placeholder={isMedia ? "https://example.com/image.jpg" : "Your tag content..."}
                            maxLength={2000}
                        />
                        <p className="text-xs mt-1" style={{ color: "var(--color-text-muted)" }}>
                            {content.length}/2000
                        </p>
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
                        {submitting ? "Saving…" : editing ? "Save Changes" : "Create Tag"}
                    </button>
                </div>
            </div>
        </div>,
        document.body,
    );
}

/* ── Delete confirmation ───────────────────────────── */

function DeleteConfirmModal({ open, tag, onClose }: { open: boolean; tag: Tag | null; onClose: () => void }) {
    const queryClient = useQueryClient();

    const deleteMutation = useMutation({
        mutationFn: async (id: number) => {
            return api.delete(`api/izuna/users/me/tags/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["tags"] });
            onClose();
        },
    });

    if (!open || !tag) return null;


    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }} />
            <div
                className="relative w-full max-w-sm rounded-2xl p-6"
                style={{ background: "var(--color-navy-800)", border: "1px solid var(--color-border)" }}
                onClick={(e) => e.stopPropagation()}
            >
                <h2 className="text-lg mb-2" style={{ fontFamily: "var(--font-display)" }}>
                    Delete Tag
                </h2>
                <p className="text-sm mb-6" style={{ color: "var(--color-text-secondary)" }}>
                    Are you sure you want to delete <span style={{ color: "var(--color-accent)" }}>{tag.name}</span>? This action cannot be undone.
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
                        onClick={() => deleteMutation.mutate(tag.id)}
                        disabled={deleteMutation.isPending}
                        className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold cursor-pointer transition-all duration-200 disabled:opacity-50"
                        style={{ background: "var(--color-accent)", color: "#fff" }}
                    >
                        {deleteMutation.isPending ? "Deleting…" : "Delete"}
                    </button>
                </div>
            </div>
        </div>,
        document.body,
    );
}
/* ── Page ──────────────────────────────────────────── */

export default function V2Tags() {
    const [search, setSearch] = useState("");
    const [showMedia, setShowMedia] = useState<boolean | null>(null);
    const [modal, setModal] = useState<{ type: "create" | "edit" | "delete" | "view" | null; tag: Tag | null }>({ type: null, tag: null });
    const containerRef = useRef<HTMLDivElement>(null);

    const { data, isLoading } = useQuery({
        queryKey: ["tags"],
        queryFn: async () => {
            const res = await api.get("api/izuna/users/me/tags").json<TagsResponse>();
            return res.data;
        },
    });

    useGSAP(
        () => {
            gsap.from(".tag-card-wrapper", {
                opacity: 0,
                y: 20,
                stagger: 0.06,
                duration: 0.5,
                ease: "power3.out",
            });
        },
        { dependencies: [] },
    );

    const tags = data ?? [];
    const filtered = tags.filter((t) => {
        if (showMedia !== null && t.isMedia !== showMedia) return false;
        if (search && !t.name.toLowerCase().includes(search.toLowerCase()) && !t.message.toLowerCase().includes(search.toLowerCase()))
            return false;
        return true;
    });

    return (
        <div ref={containerRef} className="max-w-5xl mx-auto py-8 px-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl m-0" style={{ fontFamily: "var(--font-display)" }}>
                        Tags
                        {!isLoading && (
                            <span className="ml-2 text-sm font-normal" style={{ color: "var(--color-text-muted)" }}>
                                ({filtered.length})
                            </span>
                        )}
                    </h1>
                </div>
                <button
                    onClick={() => setModal({ type: "create", tag: null })}
                    className="px-4 py-2 rounded-xl text-sm font-semibold cursor-pointer transition-all duration-200 hover:scale-105"
                    style={{ background: "var(--color-accent)", color: "#fff" }}
                >
                    + Create Tag
                </button>
            </div>

            {/* Filters */}
            <div className="flex gap-3 mb-6">
                <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="flex-1 px-4 py-2 rounded-xl text-sm outline-none"
                    style={{
                        background: "var(--color-surface)",
                        border: "1px solid var(--color-border)",
                        color: "var(--color-text-primary)",
                        maxWidth: "320px",
                    }}
                    placeholder="Search tags…"
                />
                <button
                    onClick={() => setShowMedia(showMedia === null ? true : showMedia === true ? false : null)}
                    className="px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
                    style={{
                        background: showMedia === true ? "rgba(255,215,0,0.15)" : showMedia === false ? "rgba(0,210,160,0.15)" : "var(--color-surface)",
                        color: showMedia === true ? "var(--color-gold)" : showMedia === false ? "var(--color-positive)" : "var(--color-text-muted)",
                    }}
                >
                    {showMedia === null ? "All" : showMedia ? "Media Only" : "Text Only"}
                </button>
            </div>

            {/* Loading */}
            {isLoading && (
                <div className="text-center py-16" style={{ color: "var(--color-text-muted)" }}>
                    Loading tags...
                </div>
            )}
            {/* Tag grid */}
            {!isLoading && filtered.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-stretch">
                    {filtered.map((tag) => (
                        <div key={tag.id} className="tag-card-wrapper h-full">
                            <TagCard
                                tag={tag}
                                onEdit={(t) => setModal({ type: "edit", tag: t })}
                                onDelete={(t) => setModal({ type: "delete", tag: t })}
                                onView={(t) => setModal({ type: "view", tag: t })}
                            />
                        </div>
                    ))}
                </div>
            )}
            {!isLoading && tags.length === 0 && (
                <EmptyState onAction={() => setModal({ type: "create", tag: null })} />
            )}


            <TagDetailModal
                open={modal.type === "view"}
                tag={modal.tag}
                onClose={() => setModal({ type: null, tag: null })}
            />
            <TagFormModal
                open={modal.type === "create" || modal.type === "edit"}
                editing={modal.type === "edit" ? modal.tag : null}
                onClose={() => setModal({ type: null, tag: null })}
            />
            <DeleteConfirmModal
                open={modal.type === "delete"}
                tag={modal.tag}
                onClose={() => setModal({ type: null, tag: null })}
            />
        </div>
    );
}