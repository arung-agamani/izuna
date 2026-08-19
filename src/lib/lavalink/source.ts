import type { ParsedUrl } from "../urlParser.js";

/**
 * Coarse source category used to route Lavalink resolution to preferred nodes.
 * Only two categories exist today; add a member + a DEFAULT_SOURCE_TAGS entry to grow.
 */
export type NodeSource = "youtube" | "http";

/**
 * Map a parsed user input to its source category.
 * - YouTube videos, playlists and searches all resolve through YouTube → "youtube".
 * - Generic HTTP URLs and Google Drive (converted to a direct stream downstream) → "http".
 */
export function sourceOf(parsed: ParsedUrl): NodeSource {
    switch (parsed.type) {
        case "youtube-video":
        case "youtube-playlist":
        case "search": // getLavalinkQuery turns search into ytsearch:
            return "youtube";
        case "http":
        case "google-drive":
            return "http";
    }
}
