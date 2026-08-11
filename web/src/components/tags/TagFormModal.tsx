import { useState, useCallback, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createPortal } from "react-dom";
import api from "../../routes/lib/api";
import { Tag } from "./types";

export type TagScope = "user" | { guildId: string };

interface Props {
    open: boolean;
    editing: Tag | null;
    scope: TagScope;
    onClose: () => void;
}

export default function TagFormModal({ open, editing, scope, onClose }: Props) {
    const queryClient = useQueryClient();
    const [name, setName] = useState("");
    const [content, setContent] = useState("");
    const [isMedia, setIsMedia] = useState(false);
    const [error, setError] = useState("");
    const [submitting, setSubmitting] = useState(false);

    // Derive API paths from scope
    const createUrl = scope === "user" ? "api/izuna/users/me/tags" : `api/izuna/guilds/${scope.guildId}/tags`;
    const updateUrl = (id: number) => scope === "user" ? `api/izuna/users/me/tags/${id}` : `api/izuna/guilds/${scope.guildId}/tags/${id}`;
    const queryKey = scope === "user" ? ["tags"] : ["tags", scope.guildId];

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
            return api.post(createUrl, { json: body }).json<{ data: Tag }>();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey });
            onClose();
        },
        onError: async (err) => {
            setError(err instanceof Error ? err.message : "Failed to create tag");
        },
    });

    const updateMutation = useMutation({
        mutationFn: async (body: { id: number; content: string }) => {
            return api.patch(updateUrl(body.id), { json: { content: body.content } }).json<{ data: Tag }>();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey });
            onClose();
        },
        onError: async (err) => {
            setError(err instanceof Error ? err.message : "Failed to update tag");
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
                                    type="button"
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
                                    type="button"
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
                        type="button"
                        onClick={onClose}
                        className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold cursor-pointer transition-colors"
                        style={{ background: "var(--color-surface-hover)", color: "var(--color-text-secondary)" }}
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={submitting}
                        className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold cursor-pointer transition-all duration-200 disabled:opacity-50"
                        style={{ background: "var(--color-accent)", color: "#fff" }}
                    >
                        {submitting ? "Saving\u2026" : editing ? "Save Changes" : "Create Tag"}
                    </button>
                </div>
            </div>
        </div>,
        document.body,
    );
}
