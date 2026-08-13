import { createPortal } from "react-dom";
import { Tag, getMediaType } from "./types";

interface Props {
    open: boolean;
    tag: Tag | null;
    onClose: () => void;
}

export default function TagDetailModal({ open, tag, onClose }: Props) {
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

                    <div className="flex items-center gap-4 mb-6 text-xs" style={{ color: "var(--color-text-muted)" }}>
                        <span>Created {new Date(tag.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</span>
                        <span className="font-mono">ID: {tag.id}</span>
                    </div>

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
