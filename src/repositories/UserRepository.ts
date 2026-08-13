import type { PrismaClient, User } from "@prisma/client";

/**
 * Data-access layer for the User model.
 * Pure Prisma queries — no business logic, no validation, no error wrapping.
 * Constructor-injected PrismaClient so it's trivially mockable in tests.
 */
export class UserRepository {
    constructor(private readonly prisma: PrismaClient) {}

    async findById(id: number): Promise<User | null> {
        return this.prisma.user.findUnique({ where: { id } });
    }

    async findByUid(uid: string): Promise<User | null> {
        return this.prisma.user.findUnique({ where: { uid } });
    }

    async create(data: { uid: string; name: string; email: string }): Promise<User> {
        return this.prisma.user.create({
            data: {
                uid: data.uid,
                name: data.name,
                email: data.email || "",
            },
        });
    }

    async findOrCreateFromDiscord(discordUser: { id: string; username: string; email?: string }): Promise<User> {
        const existing = await this.findByUid(discordUser.id);
        if (existing) return existing;
        return this.create({
            uid: discordUser.id,
            name: discordUser.username,
            email: discordUser.email || "",
        });
    }

    async updateDiscordTokens(id: number, accessToken: string, refreshToken: string): Promise<User> {
        return this.prisma.user.update({
            where: { id },
            data: {
                discordAccessToken: accessToken,
                discordRefreshToken: refreshToken,
            },
        });
    }

    async getDiscordAccessToken(uid: string): Promise<string | null> {
        const user = await this.prisma.user.findUnique({
            where: { uid },
            select: { discordAccessToken: true },
        });
        return user?.discordAccessToken ?? null;
    }

    async getDiscordRefreshToken(uid: string): Promise<string | null> {
        const user = await this.prisma.user.findUnique({
            where: { uid },
            select: { discordRefreshToken: true },
        });
        return user?.discordRefreshToken ?? null;
    }
}
