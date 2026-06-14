import { PartialGuild } from "discord-oauth2";

export interface GuildMembership {
    name: string;
    guildId: string;
    isAdmin: boolean;
    permissionInteger: number;
    guildPartial: PartialGuild;
}

export interface SessionValue {
    guilds: GuildMembership[];
}

export interface DiscordTokenEntry {
    access_token: string;
    refresh_token: string;
    expires_at: number;
}

const discordSession = new Map<string, GuildMembership[]>();

export const oauthSessionState = new Set<string>();

export const discordAccessTokens = new Map<string, DiscordTokenEntry>();

export default discordSession;
