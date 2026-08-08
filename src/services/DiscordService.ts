import discordOauth2 from "discord-oauth2";
import discordSession, { GuildMembership } from "../lib/session";
import { PermissionsBitField } from "discord.js";
import logger, { logError, getErrorMessage } from "../lib/winston"

export class DiscordService {
    private static instance: DiscordService | null = null;
    private oauth: discordOauth2 | null = null;
    private constructor() {
        // Private constructor to enforce singleton
        this.oauth = new discordOauth2();
    }

    public static getInstance(): DiscordService {
        if (!DiscordService.instance) {
            DiscordService.instance = new DiscordService();
        }
        return DiscordService.instance;
    }

    async getUserGuilds(userId: string, accessToken: string) {
        let guilds;
        guilds = discordSession.get(userId);
        if (guilds) return guilds;
        try {
            guilds = await this.oauth?.getUserGuilds(accessToken);
            const tempGuilds: GuildMembership[] = [];
            for (const guild of guilds!) {
                tempGuilds.push({
                    name: guild.name,
                    guildId: guild.id,
                    isAdmin: new PermissionsBitField(guild.permissions as unknown as bigint).has(PermissionsBitField.Flags.Administrator),
                    permissionInteger: guild.permissions!,
                    guildPartial: guild,
                });
            }
            discordSession.set(userId, tempGuilds);
            return tempGuilds;
        } catch (error) {
            logError("Error fetching user guilds", error, { userId });
            throw error;
        }
    }
}
