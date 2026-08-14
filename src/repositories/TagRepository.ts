import type { PrismaClient, Tag } from "@prisma/client";

export type CreateTagData = Omit<Tag, "id" | "createdAt" | "updatedAt" | "deletedAt">;

/**
 * Data-access layer for the Tag model.
 * Pure Prisma queries — no business logic, no validation.
 * Soft delete: `deletedAt` is set instead of hard-deleting rows; all reads exclude soft-deleted tags.
 */
export class TagRepository {
    constructor(private readonly prisma: PrismaClient) {}

    // ── Read (all exclude soft-deleted) ─────────────────

    async findById(id: number): Promise<Tag | null> {
        return this.prisma.tag.findFirst({ where: { id, deletedAt: null } });
    }

    async findByUser(userId: string): Promise<Tag[]> {
        return this.prisma.tag.findMany({ where: { userId, isGuild: false, deletedAt: null } });
    }

    async findByGuild(guildId: string): Promise<Tag[]> {
        return this.prisma.tag.findMany({ where: { guildId, isGuild: true, deletedAt: null } });
    }

    async findUserTagByName(userId: string, name: string): Promise<Tag | null> {
        return this.prisma.tag.findFirst({ where: { userId, isGuild: false, name, deletedAt: null } });
    }

    async findGuildTagByName(guildId: string, name: string): Promise<Tag | null> {
        return this.prisma.tag.findFirst({ where: { guildId, isGuild: true, name, deletedAt: null } });
    }

    /**
     * Find all active tags whose guildId is in the given list.
     * Used by closure routes to check which servers have Closure installed.
     */
    async findGuildsWithTags(guildIds: string[]): Promise<Tag[]> {
        return this.prisma.tag.findMany({ where: { guildId: { in: guildIds }, deletedAt: null } });
    }

    /**
     * Search tags by name prefix. Scope: guild-scoped (when guildId given) or user-scoped.
     */
    async search(guildId: string | null, userId: string, query: string): Promise<Tag[]> {
        if (guildId) {
            return this.prisma.tag.findMany({ where: { guildId, isGuild: true, name: { startsWith: query }, deletedAt: null } });
        }
        return this.prisma.tag.findMany({ where: { userId, isGuild: false, name: { startsWith: query }, deletedAt: null } });
    }

    // ── Write ───────────────────────────────────────────

    async create(data: CreateTagData): Promise<Tag> {
        return this.prisma.tag.create({ data });
    }

    async updateById(id: number, data: Partial<Pick<Tag, "message" | "isMedia">>): Promise<Tag> {
        return this.prisma.tag.update({ where: { id }, data });
    }

    /**
     * Upsert a guild-scoped tag: update if active exists, create if not.
     */
    async upsertGuildTag(guildId: string, name: string, data: CreateTagData): Promise<Tag> {
        const existing = await this.findGuildTagByName(guildId, name);
        if (existing) {
            await this.prisma.tag.updateMany({ where: { guildId, isGuild: true, name, deletedAt: null }, data });
            return this.prisma.tag.findFirst({ where: { guildId, isGuild: true, name, deletedAt: null } }) as Promise<Tag>;
        }
        return this.prisma.tag.create({ data: { ...data, guildId, isGuild: true } });
    }

    /**
     * Upsert a user-scoped tag.
     */
    async upsertUserTag(userId: string, name: string, data: CreateTagData): Promise<Tag> {
        const existing = await this.findUserTagByName(userId, name);
        if (existing) {
            await this.prisma.tag.updateMany({ where: { userId, isGuild: false, name, deletedAt: null }, data });
            return this.prisma.tag.findFirst({ where: { userId, isGuild: false, name, deletedAt: null } }) as Promise<Tag>;
        }
        return this.prisma.tag.create({ data: { ...data, userId, isGuild: false } });
    }

    // ── Soft delete ─────────────────────────────────────

    async deleteById(id: number): Promise<void> {
        await this.prisma.tag.update({ where: { id }, data: { deletedAt: new Date() } });
    }

    async deleteGuildTag(guildId: string, name: string): Promise<void> {
        await this.prisma.tag.updateMany({ where: { guildId, isGuild: true, name, deletedAt: null }, data: { deletedAt: new Date() } });
    }

    async deleteUserTag(userId: string, name: string): Promise<void> {
        await this.prisma.tag.updateMany({ where: { userId, isGuild: false, name, deletedAt: null }, data: { deletedAt: new Date() } });
    }
}
