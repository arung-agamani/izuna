import { UserRepository } from "../repositories/UserRepository";
import prisma from "../lib/prisma";
import logger, { logError, getErrorMessage } from "../lib/winston";

export class UserService {
    private static instance: UserService | null = null;
    private readonly repo: UserRepository;

    constructor(repository?: UserRepository) {
        this.repo = repository ?? new UserRepository(prisma);
    }

    public static getInstance(): UserService {
        if (!UserService.instance) {
            UserService.instance = new UserService();
        }
        return UserService.instance;
    }

    async getUserById(id: number) {
        try {
            return await this.repo.findById(id);
        } catch (error) {
            logError("Error fetching user by id:", error);
            throw new Error("Failed to fetch user");
        }
    }

    async getUserByUid(uid: string) {
        try {
            return await this.repo.findByUid(uid);
        } catch (error) {
            logError("Error fetching user by uid:", error);
            throw new Error("Failed to fetch user");
        }
    }

    async createUser(data: { uid: string; name: string; email: string }) {
        try {
            return await this.repo.create(data);
        } catch (error) {
            logError("Error creating user:", error);
            throw new Error("Failed to create user");
        }
    }

    async findOrCreateUser(discordUser: { id: string; username: string; email?: string }) {
        try {
            return await this.repo.findOrCreateFromDiscord(discordUser);
        } catch (error) {
            logError("Error finding or creating user:", error);
            throw new Error("Failed to find or create user");
        }
    }

    async updateDiscordTokens(id: number, accessToken: string, refreshToken: string) {
        try {
            return await this.repo.updateDiscordTokens(id, accessToken, refreshToken);
        } catch (error) {
            logError("Error updating Discord tokens:", error);
            throw new Error("Failed to update Discord tokens");
        }
    }

    async getDiscordAccessToken(uid: string): Promise<string | null> {
        try {
            return await this.repo.getDiscordAccessToken(uid);
        } catch (error) {
            logError("Error fetching Discord access token:", error);
            return null;
        }
    }
}

export default UserService;
