import { drive_v3, google } from "googleapis";

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
