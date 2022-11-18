import { drive_v3, google } from "googleapis";

interface OAuthData {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
}

let googleClient: drive_v3.Drive | null = null;
export function getGoogleClient() {
    if (googleClient !== null) {
        return googleClient;
    }
    const drive = google.drive({
        version: "v3",
        auth: process.env["GOOGLE_CLOSURE_API_KEY"]!,
    });
    googleClient = drive;
    return googleClient;
}

export const closureGoogleOauthTracker = new Map<String, OAuthData>();
export const closureGoogleOauthState = new Set<string>();
