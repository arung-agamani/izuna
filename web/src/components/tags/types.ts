export interface Tag {
    id: number;
    userId: string;
    guildId: string | null;
    name: string;
    createdAt: string;
    message: string;
    isMedia: boolean;
    isGuild: boolean;
}

export interface TagsResponse {
    data: Tag[];
    count: number;
}

export function timeAgo(dateStr: string): string {
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

export function truncate(str: string, n: number): string {
    return str.length > n ? str.slice(0, n) + "\u2026" : str;
}

export function getMediaType(url: string): "image" | "video" | null {
    const ext = url.split("?")[0].split(".").pop()?.toLowerCase();
    if (!ext) return null;
    if (["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp"].includes(ext)) return "image";
    if (["mp4", "webm", "mov", "ogv"].includes(ext)) return "video";
    return null;
}
