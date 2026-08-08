import type { PrismaClient, Tag } from "@prisma/client";

export type CreateTagData = Omit<Tag, "id">;

/**
 * Data-access layer for the Tag model.
 * Pure Prisma queries — no business logic, no validation.
 */
export class TagRepository {
    constructor(private readonly prisma: PrismaClient) {}

    // ── Read ──────────────────────────────────────────────

    async findById(id: number): Promise<Tag | null> {
        return this.prisma.tag.findUnique({ where: { id } });
    }

    async findByUser(userId: string): Promise<Tag[]> {
        return this.prisma.tag.findMany({ where: { userId, isGuild: false } });
    }

    async findByGuild(guildId: string): Promise<Tag[]> {
        return this.prisma.tag.findMany({ where: { guildId, isGuild: true } });
    }

    async findUserTagByName(userId: string, name: string): Promise<Tag | null> {
        return this.prisma.tag.findFirst({ where: { userId, isGuild: false, name } });
    }

    async findGuildTagByName(guildId: string, name: string): Promise<Tag | null> {
        return this.prisma.tag.findFirst({ where: { guildId, isGuild: true, name } });
    }

    /**
     * Find all tags whose guildId is in the given list.
     * Used by closure routes to check which servers have Closure installed.
     */
    async findGuildsWithTags(guildIds: string[]): Promise<Tag[]> {
        return this.prisma.tag.findMany({ where: { guildId: { in: guildIds } } });
    }

    /**
     * Search tags by name prefix. Scope: guild-scoped (when guildId given) or user-scoped.
     */
    async search(guildId: string | null, userId: string, query: string): Promise<Tag[]> {
        if (guildId) {
            return this.prisma.tag.findMany({ where: { guildId, isGuild: true, name: { startsWith: query } } });
        }
        return this.prisma.tag.findMany({ where: { userId, isGuild: false, name: { startsWith: query } } });
    }

    // ── Write ─────────────────────────────────────────────

    async create(data: CreateTagData): Promise<Tag> {
        return this.prisma.tag.create({ data });
    }

    async updateById(id: number, data: Partial<Pick<Tag, "message" | "isMedia">>): Promise<Tag> {
        return this.prisma.tag.update({ where: { id }, data });
    }

    /**
     * Upsert a guild-scoped tag: update if exists, create if not.
     * Uses updateMany + create because there's no unique constraint on (guildId, name, isGuild).
     */
    async upsertGuildTag(guildId: string, name: string, data: CreateTagData): Promise<Tag> {
        const existing = await this.findGuildTagByName(guildId, name);
        if (existing) {
            await this.prisma.tag.updateMany({ where: { guildId, isGuild: true, name }, data });
            return this.prisma.tag.findFirst({ where: { guildId, isGuild: true, name } }) as Promise<Tag>;
        }
        return this.prisma.tag.create({ data: { ...data, guildId, isGuild: true } });
    }

    /**
     * Upsert a user-scoped tag.
     */
    async upsertUserTag(userId: string, name: string, data: CreateTagData): Promise<Tag> {
        const existing = await this.findUserTagByName(userId, name);
        if (existing) {
            await this.prisma.tag.updateMany({ where: { userId, isGuild: false, name }, data });
            return this.prisma.tag.findFirst({ where: { userId, isGuild: false, name } }) as Promise<Tag>;
        }
        return this.prisma.tag.create({ data: { ...data, userId, isGuild: false } });
    }

    async deleteById(id: number): Promise<void> {
        await this.prisma.tag.delete({ where: { id } });
    }

    async deleteGuildTag(guildId: string, name: string): Promise<void> {
        await this.prisma.tag.deleteMany({ where: { guildId, isGuild: true, name } });
    }

    async deleteUserTag(userId: string, name: string): Promise<void> {
        await this.prisma.tag.deleteMany({ where: { userId, isGuild: false, name } });
    }
}
