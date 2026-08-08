import prisma from "../lib/prisma";
import logger, { logError, getErrorMessage } from "../lib/winston"
import { DiscordService } from "./DiscordService";
import UserService from "./UserService";

export class GuildService {
    private static instance: GuildService | null = null;

    private constructor() {
        // Private constructor to enforce singleton
    }

    public static getInstance(): GuildService {
        if (!GuildService.instance) {
            GuildService.instance = new GuildService();
        }
        return GuildService.instance;
    }

    async getGuildsForUser(userId: string) {
        try {
            const user = await UserService.getInstance().getUserByUid(userId);
            if (!user) {
                throw new Error("User not found");
            }
            const accessToken = user.discordAccessToken
            if (!accessToken) {
                throw new Error("User does not have a Discord access token");
            }
            const guilds = await DiscordService.getInstance().getUserGuilds(userId, accessToken);

            return guilds;
        } catch (error) {
            logError("Error fetching guilds for user:", error);
            throw new Error("Failed to fetch guilds for user");
        }
    }
}