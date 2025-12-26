/**
 * URL Parser Utility
 *
 * Handles extraction and parsing of various URL types:
 * - YouTube video links
 * - YouTube playlist links
 * - Google Drive links
 * - HTTP/HTTPS URLs
 * - Timestamps for seeking
 */

/**
 * Regex patterns for URL matching
 */
export const URL_PATTERNS = {
    /**
     * YouTube video regex - matches:
     * - https://youtube.com/watch?v=ID
     * - https://youtu.be/ID
     * - https://www.youtube.com/watch?v=ID
     * - https://m.youtube.com/watch?v=ID
     */
    youtubeVideo: /^((?:https?:)?\/\/)?((?:www|m)\.)?((?:youtube\.com|youtu.be))(\/(?:[\w\-]+\?v=|embed\/|v\/)?)([\w\-]+)(\S+)?$/,

    /**
     * YouTube playlist regex - matches:
     * - https://youtube.com/playlist?list=ID
     * - https://youtube.com/watch?v=ID&list=ID (with or without v parameter)
     */
    youtubePlaylist: /(?:https?:\/\/)?(?:youtu\.be\/|(?:www\.|m\.)?youtube\.com\/(?:playlist|list|embed)(?:\.php)?(?:\?.*list=|\/))([a-zA-Z0-9\-_]+)/,

    /**
     * Google Drive regex - matches:
     * - https://drive.google.com/file/d/ID/view
     * - /file/d/ID
     */
    googleDrive: /\/file\/d\/([^\/]+)/,

    /**
     * YouTube timestamp regex - matches:
     * - &t=1h2m3s
     * - &t=123s
     */
    timestamp: /[&?]t=([0-9A-Za-z]+)/,

    /**
     * HMS (hours/minutes/seconds) pattern for timestamp parsing
     */
    hms: /[hms]+/g,
};

/**
 * Represents a parsed YouTube URL
 */
export interface YouTubeVideoUrl {
    type: "youtube-video";
    videoId: string;
    timestamp?: number; // in milliseconds
    fullUrl: string;
}

/**
 * Represents a parsed YouTube playlist URL
 */
export interface YouTubePlaylistUrl {
    type: "youtube-playlist";
    playlistId: string;
    fullUrl: string;
}

/**
 * Represents a parsed Google Drive URL
 */
export interface GoogleDriveUrl {
    type: "google-drive";
    fileId: string;
    fullUrl: string;
}

/**
 * Represents a generic HTTP URL
 */
export interface HttpUrl {
    type: "http";
    url: string;
}

/**
 * Represents a search query
 */
export interface SearchQuery {
    type: "search";
    query: string;
}

export type ParsedUrl = YouTubeVideoUrl | YouTubePlaylistUrl | GoogleDriveUrl | HttpUrl | SearchQuery;

/**
 * Parse a timestamp string (e.g., "1h2m3s", "123s") to milliseconds
 * @param timestampStr - The timestamp string to parse
 * @returns Timestamp in milliseconds
 */
export function parseTimestamp(timestampStr: string): number {
    // Replace h, m, s with colons and split
    const formatted = timestampStr
        .replaceAll(URL_PATTERNS.hms, ":")
        .split(":")
        .slice(0, -1) // Remove empty string at end
        .reverse();

    return formatted.reduce((acc, curr, idx) => acc + Number(curr) * Math.pow(60, idx), 0) * 1000;
}

/**
 * Extract timestamp from a URL query string
 * @param url - The URL string to search for timestamp
 * @returns Timestamp in milliseconds, or undefined if not found
 */
export function extractTimestampFromUrl(url: string): number | undefined {
    const match = URL_PATTERNS.timestamp.exec(url);
    if (!match || !match[1]) return undefined;

    return parseTimestamp(match[1]);
}

/**
 * Parse a user input string into a structured URL type
 * Handles URL detection, validation, and extraction
 *
 * @param input - User input string (URL or search query)
 * @param seekMode - Whether to extract timestamp if available (for seeking)
 * @returns Parsed URL object with type information
 */
export function parseUrl(input: string, seekMode: boolean = false): ParsedUrl {
    if (!input || input.trim() === "") {
        return {
            type: "search",
            query: "",
        };
    }

    const trimmedInput = input.trim();

    // Check for YouTube playlist FIRST (before video check)
    // This is important because playlist URLs can contain video IDs that would match the video regex
    const playlistMatch = URL_PATTERNS.youtubePlaylist.exec(trimmedInput);
    if (playlistMatch && playlistMatch[1]) {
        const playlistId = playlistMatch[1];

        return {
            type: "youtube-playlist",
            playlistId,
            fullUrl: trimmedInput,
        };
    }

    // Check for YouTube video (after playlist check)
    const youtubeVideoMatch = URL_PATTERNS.youtubeVideo.exec(trimmedInput);
    if (youtubeVideoMatch && youtubeVideoMatch[5]) {
        const videoId = youtubeVideoMatch[5];
        const timestamp = seekMode ? extractTimestampFromUrl(trimmedInput) : undefined;

        return {
            type: "youtube-video",
            videoId,
            timestamp,
            fullUrl: trimmedInput,
        };
    }

    // Check for Google Drive
    const driveMatch = URL_PATTERNS.googleDrive.exec(trimmedInput);
    if (driveMatch && driveMatch[1]) {
        const fileId = driveMatch[1];

        return {
            type: "google-drive",
            fileId,
            fullUrl: trimmedInput,
        };
    }

    // Check for HTTP/HTTPS URL (using a simple check)
    if (trimmedInput.startsWith("http://") || trimmedInput.startsWith("https://")) {
        return {
            type: "http",
            url: trimmedInput,
        };
    }

    // Default to search query
    return {
        type: "search",
        query: trimmedInput,
    };
}

/**
 * Check if a string is a valid HTTP/HTTPS URL
 * @param url - The string to check
 * @returns True if it's a valid HTTP URL
 */
export function isHttpUrl(url: string): boolean {
    try {
        const parsed = new URL(url);
        return parsed.protocol === "http:" || parsed.protocol === "https:";
    } catch {
        return false;
    }
}

/**
 * Get a Lavalink query string from a parsed URL
 * Used to determine what string to pass to Lavalink's REST resolve
 *
 * @param parsed - The parsed URL object
 * @returns String to pass to Lavalink resolver
 */
export function getLavalinkQuery(parsed: ParsedUrl): string {
    switch (parsed.type) {
        case "youtube-video":
            return parsed.videoId;
        case "youtube-playlist":
            return parsed.playlistId.startsWith("OLAK5uy") ? `https://www.youtube.com/playlist?list=${parsed.playlistId}` : parsed.playlistId;
        case "google-drive":
            // Google Drive needs special handling - return as-is for later processing
            return parsed.fileId;
        case "http":
            return parsed.url;
        case "search":
            return `ytsearch:${parsed.query}`;
    }
}
