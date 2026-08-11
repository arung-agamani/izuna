import { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import * as Select from "@radix-ui/react-select";
import { useGuilds } from "../../hooks/useGuilds";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import api from "../lib/api";
import { Tag, TagsResponse } from "../../components/tags/types";
import TagCard from "../../components/tags/TagCard";
import TagDetailModal from "../../components/tags/TagDetailModal";
import TagFormModal, { TagScope } from "../../components/tags/TagFormModal";
import TagDeleteModal from "../../components/tags/TagDeleteModal";

gsap.registerPlugin(useGSAP);

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

export default function V2Tags() {
    const [search, setSearch] = useState("");
    const [showMedia, setShowMedia] = useState<boolean | null>(null);
    const [scope, setScope] = useState<"user" | string>("user");
    const [modal, setModal] = useState<{ type: "create" | "edit" | "delete" | "view" | null; tag: Tag | null }>({ type: null, tag: null });
    const containerRef = useRef<HTMLDivElement>(null);

    const { data: guildsData } = useGuilds();
    const guilds = guildsData?.guilds ?? [];

    const { data: userTags, isLoading: userLoading } = useQuery({
        queryKey: ["tags"],
        queryFn: async () => {
            const res = await api.get("api/izuna/users/me/tags").json<TagsResponse>();
            return res.data;
        },
    });

    const { data: guildTags, isLoading: guildLoading } = useQuery({
        queryKey: ["tags", scope],
        queryFn: async () => {
            if (scope === "user") return [];
            const res = await api.get(`api/izuna/guilds/${scope}/tags`).json<TagsResponse>();
            return res.data;
        },
        enabled: scope !== "user",
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
        { dependencies: [scope] },
    );

    const tags = scope === "user" ? (userTags ?? []) : (guildTags ?? []);
    const isLoading = scope === "user" ? userLoading : guildLoading;

    const filtered = tags.filter((t) => {
        if (showMedia !== null && t.isMedia !== showMedia) return false;
        if (search && !t.name.toLowerCase().includes(search.toLowerCase()) && !t.message.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
    });

    const tagScope: TagScope = scope === "user" ? "user" : { guildId: scope };

    return (
        <div ref={containerRef} className="mx-auto py-8 px-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
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

            {/* Scope tabs + Guild selector */}
            <div className="flex items-center gap-3 mb-4">
                <button
                    onClick={() => setScope("user")}
                    className="px-4 py-2 rounded-xl text-sm font-semibold cursor-pointer transition-colors"
                    style={{
                        background: scope === "user" ? "var(--color-accent)" : "var(--color-surface)",
                        color: scope === "user" ? "#fff" : "var(--color-text-secondary)",
                    }}
                >
                    My Tags
                </button>
                <button
                    onClick={() => { const g = guilds[0]; if (g) setScope(g.guildId); }}
                    className="px-4 py-2 rounded-xl text-sm font-semibold cursor-pointer transition-colors"
                    style={{
                        background: scope !== "user" ? "var(--color-gold)" : "var(--color-surface)",
                        color: scope !== "user" ? "#0a0a1a" : "var(--color-text-secondary)",
                    }}
                >
                    Guild Tags
                </button>

                {scope !== "user" && guilds.length > 0 && (
                    <Select.Root value={scope} onValueChange={setScope}>
                        <Select.Trigger
                            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm outline-none cursor-pointer"
                            style={{
                                background: "var(--color-surface)",
                                border: "1px solid var(--color-border)",
                                color: "var(--color-text-primary)",
                            }}
                        >
                            <Select.Value />
                            <Select.Icon className="text-xs" style={{ color: "var(--color-text-muted)" }}>&#9660;</Select.Icon>
                        </Select.Trigger>
                        <Select.Portal>
                            <Select.Content
                                className="z-50 rounded-xl overflow-hidden"
                                style={{
                                    background: "var(--color-navy-800)",
                                    border: "1px solid var(--color-border)",
                                    boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
                                }}
                            >
                                <Select.Viewport>
                                    {guilds.map((g) => (
                                        <Select.Item
                                            key={g.guildId}
                                            value={g.guildId}
                                            className="px-4 py-2.5 text-sm outline-none cursor-pointer flex items-center gap-2 transition-colors hover:bg-white/5"
                                            style={{ color: "var(--color-text-primary)" }}
                                        >
                                            <Select.ItemText>{g.name}</Select.ItemText>
                                        </Select.Item>
                                    ))}
                                </Select.Viewport>
                            </Select.Content>
                        </Select.Portal>
                    </Select.Root>
                )}
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
                    placeholder="Search tags\u2026"
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

            {/* Empty states */}
            {!isLoading && tags.length === 0 && scope === "user" && (
                <EmptyState onAction={() => setModal({ type: "create", tag: null })} />
            )}
            {!isLoading && tags.length === 0 && scope !== "user" && (
                <div className="text-center py-16">
                    <p className="text-4xl mb-4">🏰</p>
                    <h2 className="text-xl mb-2" style={{ fontFamily: "var(--font-display)" }}>
                        No guild tags
                    </h2>
                    <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
                        This server doesn&apos;t have any tags yet.
                    </p>
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

            {/* Modals */}
            <TagDetailModal open={modal.type === "view"} tag={modal.tag} onClose={() => setModal({ type: null, tag: null })} />
            <TagFormModal
                open={modal.type === "create" || modal.type === "edit"}
                editing={modal.type === "edit" ? modal.tag : null}
                scope={tagScope}
                onClose={() => setModal({ type: null, tag: null })}
            />
            <TagDeleteModal
                open={modal.type === "delete"}
                tag={modal.tag}
                scope={tagScope}
                onClose={() => setModal({ type: null, tag: null })}
            />
        </div>
    );
}
