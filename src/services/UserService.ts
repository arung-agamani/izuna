import prisma from "../lib/prisma";
import logger from "../lib/winston";

export class UserService {
    private static instance: UserService | null = null;

    private constructor() {
        // Private constructor to enforce singleton
    }

    public static getInstance(): UserService {
        if (!UserService.instance) {
            UserService.instance = new UserService();
        }
        return UserService.instance;
    }

    async getUserById(id: number) {
        try {
            return await prisma.user.findUnique({ where: { id } });
        } catch (error) {
            logger.error("Error fetching user by id:", error);
            throw new Error("Failed to fetch user");
        }
    }

    async getUserByUid(uid: string) {
        try {
            return await prisma.user.findUnique({ where: { uid } });
        } catch (error) {
            logger.error("Error fetching user by uid:", error);
            throw new Error("Failed to fetch user");
        }
    }

    async createUser(data: { uid: string; name: string; email: string }) {
        try {
            return await prisma.user.create({
                data: {
                    uid: data.uid,
                    name: data.name,
                    email: data.email || "",
                    dateCreated: new Date(),
                },
            });
        } catch (error) {
            logger.error("Error creating user:", error);
            throw new Error("Failed to create user");
        }
    }

    async findOrCreateUser(discordUser: { id: string; username: string; email?: string }) {
        let user = await this.getUserByUid(discordUser.id);
        if (!user) {
            user = await this.createUser({
                uid: discordUser.id,
                name: discordUser.username,
                email: discordUser.email || "",
            });
        }
        return user;
    }

    async updateDiscordTokens(id: number, accessToken: string, refreshToken: string) {
        try {
            return await prisma.user.update({
                where: { id },
                data: {
                    discordAccessToken: accessToken,
                    discordRefreshToken: refreshToken,
                },
            });
        } catch (error) {
            logger.error("Error updating Discord tokens:", error);
            throw new Error("Failed to update Discord tokens");
        }
    }

    async getDiscordAccessToken(uid: string): Promise<string | null> {
        try {
            const user = await prisma.user.findUnique({
                where: { uid },
                select: { discordAccessToken: true },
            });
            return user?.discordAccessToken || null;
        } catch (error) {
            logger.error("Error fetching Discord access token:", error);
            return null;
        }
    }
}

export default UserService;
