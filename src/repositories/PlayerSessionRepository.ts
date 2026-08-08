import type { PrismaClient } from "@prisma/client";

/**
 * Data-access layer for PlayerSession cleanup.
 */
export class PlayerSessionRepository {
    constructor(private readonly prisma: PrismaClient) {}

    async deleteByGuild(guildId: string): Promise<void> {
        await this.prisma.playerSession.deleteMany({ where: { guildId } });
    }
}
