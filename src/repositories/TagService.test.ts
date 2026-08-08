import { describe, it, expect, vi } from "vitest";
import { TagService } from "../services/TagService";
import { TagRepository } from "./TagRepository";
import type { Tag } from "@prisma/client";

function makeTag(overrides: Partial<Tag> = {}): Tag {
    return {
        id: overrides.id ?? 1,
        userId: overrides.userId ?? "123",
        guildId: overrides.guildId ?? "",
        name: overrides.name ?? "test",
        dateCreated: overrides.dateCreated ?? new Date(),
        message: overrides.message ?? "hello world",
        isMedia: overrides.isMedia ?? false,
        isGuild: overrides.isGuild ?? false,
    };
}

function mockTagRepo(overrides: Partial<TagRepository> = {}): TagRepository {
    return {
        findById: vi.fn().mockResolvedValue(null),
        findByUser: vi.fn().mockResolvedValue([]),
        findByGuild: vi.fn().mockResolvedValue([]),
        findUserTagByName: vi.fn().mockResolvedValue(null),
        findGuildTagByName: vi.fn().mockResolvedValue(null),
        findGuildsWithTags: vi.fn().mockResolvedValue([]),
        search: vi.fn().mockResolvedValue([]),
        create: vi.fn(),
        updateById: vi.fn(),
        upsertGuildTag: vi.fn(),
        upsertUserTag: vi.fn(),
        deleteById: vi.fn(),
        deleteGuildTag: vi.fn(),
        deleteUserTag: vi.fn(),
        ...overrides,
    } as unknown as TagRepository;
}

describe("TagService", () => {
    describe("validateName", () => {
        const service = new TagService(mockTagRepo());

        it("accepts alphanumeric names", () => {
            expect(service.validateName("hello")).toBe(true);
            expect(service.validateName("Test123")).toBe(true);
            expect(service.validateName("foo")).toBe(true);
        });

        it("rejects names with special characters or spaces", () => {
            expect(service.validateName("hello world")).toBe(false);
            expect(service.validateName("foo-bar")).toBe(false);
            expect(service.validateName("tag_name")).toBe(false);
            expect(service.validateName("")).toBe(false);
        });
    });

    describe("resolve", () => {
        it("returns user-scoped tag first", async () => {
            const userTag = makeTag({ name: "greet", isGuild: false, userId: "123" });
            const repo = mockTagRepo({ findUserTagByName: vi.fn().mockResolvedValue(userTag) });
            const service = new TagService(repo);

            const result = await service.resolve("123", "456", "greet");
            expect(result).toEqual(userTag);
            expect(repo.findUserTagByName).toHaveBeenCalledWith("123", "greet");
            expect(repo.findGuildTagByName).not.toHaveBeenCalled();
        });

        it("falls back to guild-scoped tag when user tag not found", async () => {
            const guildTag = makeTag({ name: "greet", isGuild: true, guildId: "456" });
            const repo = mockTagRepo({
                findUserTagByName: vi.fn().mockResolvedValue(null),
                findGuildTagByName: vi.fn().mockResolvedValue(guildTag),
            });
            const service = new TagService(repo);

            const result = await service.resolve("123", "456", "greet");
            expect(result).toEqual(guildTag);
        });

        it("returns null when no tag found in either scope", async () => {
            const repo = mockTagRepo();
            const service = new TagService(repo);

            const result = await service.resolve("123", "456", "unknown");
            expect(result).toBeNull();
        });
    });

    describe("upsertTextTag", () => {
        it("upserts a user-scoped text tag", async () => {
            const created = makeTag({ name: "test", isGuild: false, userId: "123" });
            const repo = mockTagRepo({ upsertUserTag: vi.fn().mockResolvedValue(created) });
            const service = new TagService(repo);

            const result = await service.upsertTextTag({ type: "user", userId: "123" }, "test", "hello", "123");
            expect(result).toEqual(created);
            expect(repo.upsertUserTag).toHaveBeenCalled();
        });

        it("upserts a guild-scoped text tag", async () => {
            const created = makeTag({ name: "test", isGuild: true, guildId: "456" });
            const repo = mockTagRepo({ upsertGuildTag: vi.fn().mockResolvedValue(created) });
            const service = new TagService(repo);

            const result = await service.upsertTextTag({ type: "guild", guildId: "456" }, "test", "hello", "123");
            expect(result).toEqual(created);
            expect(repo.upsertGuildTag).toHaveBeenCalled();
        });
    });
});
