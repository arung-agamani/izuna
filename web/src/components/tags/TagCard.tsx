import gsap from "gsap";
import { Tag, timeAgo, truncate, getMediaType } from "./types";

interface Props {
    tag: Tag;
    onEdit: (tag: Tag) => void;
    onDelete: (tag: Tag) => void;
    onView: (tag: Tag) => void;
}

export default function TagCard({ tag, onEdit, onDelete, onView }: Props) {
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

                <div className="flex gap-2 mt-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 shrink-0">
                    <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onEdit(tag); }}
                        className="text-xs px-3 py-1 rounded-lg cursor-pointer transition-colors duration-150"
                        style={{ background: "var(--color-surface-hover)", color: "var(--color-text-secondary)" }}
                    >
                        Edit
                    </button>
                    <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onDelete(tag); }}
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
