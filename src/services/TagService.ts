import type { Tag } from "@prisma/client";
import { TagRepository, type CreateTagData } from "../repositories/TagRepository";
import prisma from "../lib/prisma";
import logger from "../lib/winston";

const TAG_NAME_REGEX = /^[A-Za-z0-9]+$/;

export type TagScope = { type: "user"; userId: string } | { type: "guild"; guildId: string };

/**
 * Business logic for tag operations.
 * Validates input, resolves scope (user → guild fallback), delegates data access to TagRepository.
 */
export class TagService {
    private static instance: TagService | null = null;
    private readonly repo: TagRepository;

    constructor(repository?: TagRepository) {
        this.repo = repository ?? new TagRepository(prisma);
    }

    public static getInstance(): TagService {
        if (!TagService.instance) {
            TagService.instance = new TagService();
        }
        return TagService.instance;
    }

    /**
     * Validate a tag name — alphanumeric only, single word.
     */
    validateName(name: string): boolean {
        return TAG_NAME_REGEX.test(name);
    }

    /**
     * Resolve a tag by name. Checks user-scoped first, then guild-scoped fallback.
     * Returns null if no tag found.
     */
    async resolve(userId: string, guildId: string | null, name: string): Promise<Tag | null> {
        const userTag = await this.repo.findUserTagByName(userId, name);
        if (userTag) return userTag;

        if (guildId) {
            return this.repo.findGuildTagByName(guildId, name);
        }
        return null;
    }

    /**
     * Add or update a text tag.
     * Returns the created/updated tag.
     */
    async upsertTextTag(scope: TagScope, name: string, message: string, userId: string): Promise<Tag> {
        const data: CreateTagData = {
            name,
            userId,
            guildId: scope.type === "guild" ? scope.guildId : "",
            message,
            isMedia: false,
            isGuild: scope.type === "guild",
            dateCreated: new Date(),
        };

        if (scope.type === "guild") {
            return this.repo.upsertGuildTag(scope.guildId, name, data);
        }
        return this.repo.upsertUserTag(userId, name, data);
    }

    /**
     * Add or update a media tag (image, video, file).
     */
    async upsertMediaTag(scope: TagScope, name: string, mediaUrl: string, userId: string): Promise<Tag> {
        const data: CreateTagData = {
            name,
            userId,
            guildId: scope.type === "guild" ? scope.guildId : "",
            message: mediaUrl,
            isMedia: true,
            isGuild: scope.type === "guild",
            dateCreated: new Date(),
        };

        if (scope.type === "guild") {
            return this.repo.upsertGuildTag(scope.guildId, name, data);
        }
        return this.repo.upsertUserTag(userId, name, data);
    }

    /**
     * List tags for a given scope.
     */
    async list(scope: TagScope): Promise<Tag[]> {
        if (scope.type === "guild") {
            return this.repo.findByGuild(scope.guildId);
        }
        return this.repo.findByUser(scope.userId);
    }

    /**
     * Search tags by name prefix within a scope.
     */
    async search(scope: TagScope, query: string): Promise<Tag[]> {
        if (scope.type === "guild") {
            return this.repo.search(scope.guildId, "", query);
        }
        return this.repo.search(null, scope.userId, query);
    }

    /**
     * Delete a tag. For guild tags, requires admin permission (checked upstream).
     */
    async delete(scope: TagScope, name: string): Promise<void> {
        if (scope.type === "guild") {
            await this.repo.deleteGuildTag(scope.guildId, name);
        } else {
            await this.repo.deleteUserTag(scope.userId, name);
        }
    }

    /**
     * Delete a tag by ID (used by web API).
     */
    async deleteById(id: number): Promise<void> {
        await this.repo.deleteById(id);
    }

    /**
     * Update a tag's content by ID (web API path).
     */
    async updateContent(id: number, message: string): Promise<Tag> {
        return this.repo.updateById(id, { message });
    }

    /**
     * Find tags for multiple guilds (membership check — which guilds have Closure installed).
     */
    async findGuildsWithTags(guildIds: string[]): Promise<Tag[]> {
        return this.repo.findGuildsWithTags(guildIds);
    }

    /**
     * Get a single tag by ID.
     */
    async getById(id: number): Promise<Tag | null> {
        return this.repo.findById(id);
    }
}
