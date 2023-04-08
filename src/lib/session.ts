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

const discordSession = new Map<string, GuildMembership[]>();

export default discordSession;
