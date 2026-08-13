interface OAuthData {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
}

export const closureGoogleOauthTracker = new Map<string, OAuthData>();
export const closureGoogleOauthState = new Set<string>();
