import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createPortal } from "react-dom";
import api from "../../routes/lib/api";
import { Tag } from "./types";

export type TagScope = "user" | { guildId: string };

interface Props {
    open: boolean;
    tag: Tag | null;
    scope: TagScope;
    onClose: () => void;
}

export default function TagDeleteModal({ open, tag, scope, onClose }: Props) {
    const queryClient = useQueryClient();

    const deleteUrl = scope === "user" ? `api/izuna/users/me/tags/${tag?.id}` : tag ? `api/izuna/guilds/${scope.guildId}/tags/${tag.id}` : "";
    const queryKey = scope === "user" ? ["tags"] : ["tags", scope.guildId];

    const deleteMutation = useMutation({
        mutationFn: async (id: number) => {
            const url = scope === "user" ? `api/izuna/users/me/tags/${id}` : `api/izuna/guilds/${scope.guildId}/tags/${id}`;
            return api.delete(url);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey });
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
                        type="button"
                        onClick={onClose}
                        className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold cursor-pointer transition-colors"
                        style={{ background: "var(--color-surface-hover)", color: "var(--color-text-secondary)" }}
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={() => deleteMutation.mutate(tag.id)}
                        disabled={deleteMutation.isPending}
                        className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold cursor-pointer transition-all duration-200 disabled:opacity-50"
                        style={{ background: "var(--color-accent)", color: "#fff" }}
                    >
                        {deleteMutation.isPending ? "Deleting\u2026" : "Delete"}
                    </button>
                </div>
            </div>
        </div>,
        document.body,
    );
}
