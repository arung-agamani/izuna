import { describe, it, expect, vi } from "vitest";
import { TagService } from "./TagService";
import { TagRepository } from "../repositories/TagRepository";
import type { Tag } from "@prisma/client";

function makeTag(overrides: Partial<Tag> = {}): Tag {
    return {
        id: overrides.id ?? 1,
        userId: overrides.userId ?? "123",
        guildId: overrides.guildId ?? null,
        name: overrides.name ?? "test",
        createdAt: overrides.createdAt ?? new Date(),
        updatedAt: overrides.updatedAt ?? new Date(),
        deletedAt: overrides.deletedAt ?? null,
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
        it("returns user-scoped tag first without consulting the guild scope", async () => {
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
            expect(repo.findGuildTagByName).toHaveBeenCalledWith("456", "greet");
        });

        it("returns null when no tag found in either scope", async () => {
            const repo = mockTagRepo();
            const service = new TagService(repo);

            const result = await service.resolve("123", "456", "unknown");
            expect(result).toBeNull();
        });

        it("skips the guild lookup entirely when the message has no guild context", async () => {
            const repo = mockTagRepo();
            const service = new TagService(repo);

            const result = await service.resolve("123", null, "greet");
            expect(result).toBeNull();
            expect(repo.findGuildTagByName).not.toHaveBeenCalled();
        });
    });

    describe("upsertTextTag", () => {
        it("builds a user-scoped payload with null guildId and isMedia=false", async () => {
            const created = makeTag({ name: "test", isGuild: false, userId: "123" });
            const upsertUserTag = vi.fn().mockResolvedValue(created);
            const service = new TagService(mockTagRepo({ upsertUserTag }));

            const result = await service.upsertTextTag({ type: "user", userId: "123" }, "test", "hello", "123");
            expect(result).toEqual(created);
            expect(upsertUserTag).toHaveBeenCalledTimes(1);
            const [userIdArg, nameArg, dataArg] = upsertUserTag.mock.calls[0]!;
            expect(userIdArg).toBe("123");
            expect(nameArg).toBe("test");
            expect(dataArg).toMatchObject({ name: "test", userId: "123", guildId: null, message: "hello", isMedia: false, isGuild: false });
        });

        it("builds a guild-scoped payload with isGuild=true", async () => {
            const created = makeTag({ name: "test", isGuild: true, guildId: "456" });
            const upsertGuildTag = vi.fn().mockResolvedValue(created);
            const service = new TagService(mockTagRepo({ upsertGuildTag }));

            const result = await service.upsertTextTag({ type: "guild", guildId: "456" }, "test", "hello", "123");
            expect(result).toEqual(created);
            const [guildIdArg, nameArg, dataArg] = upsertGuildTag.mock.calls[0]!;
            expect(guildIdArg).toBe("456");
            expect(nameArg).toBe("test");
            expect(dataArg).toMatchObject({ name: "test", userId: "123", guildId: "456", message: "hello", isMedia: false, isGuild: true });
        });
    });

    describe("upsertMediaTag", () => {
        it("stores the media URL as the message with isMedia=true", async () => {
            const created = makeTag({ name: "pic", isMedia: true, message: "https://cdn.example/pic.png" });
            const upsertUserTag = vi.fn().mockResolvedValue(created);
            const service = new TagService(mockTagRepo({ upsertUserTag }));

            const result = await service.upsertMediaTag({ type: "user", userId: "123" }, "pic", "https://cdn.example/pic.png", "123");
            expect(result).toEqual(created);
            const [, , dataArg] = upsertUserTag.mock.calls[0]!;
            expect(dataArg).toMatchObject({ message: "https://cdn.example/pic.png", isMedia: true });
        });
    });

    describe("list", () => {
        it("lists guild tags via findByGuild", async () => {
            const findByGuild = vi.fn().mockResolvedValue([makeTag({ isGuild: true, guildId: "456" })]);
            const service = new TagService(mockTagRepo({ findByGuild }));

            const result = await service.list({ type: "guild", guildId: "456" });
            expect(result).toHaveLength(1);
            expect(findByGuild).toHaveBeenCalledWith("456");
        });

        it("lists user tags via findByUser", async () => {
            const findByUser = vi.fn().mockResolvedValue([makeTag()]);
            const service = new TagService(mockTagRepo({ findByUser }));

            const result = await service.list({ type: "user", userId: "123" });
            expect(result).toHaveLength(1);
            expect(findByUser).toHaveBeenCalledWith("123");
        });
    });

    describe("search", () => {
        it("routes guild search with the guild id", async () => {
            const search = vi.fn().mockResolvedValue([]);
            const service = new TagService(mockTagRepo({ search }));

            await service.search({ type: "guild", guildId: "456" }, "gre");
            expect(search).toHaveBeenCalledWith("456", "", "gre");
        });

        it("routes user search with null guild id", async () => {
            const search = vi.fn().mockResolvedValue([]);
            const service = new TagService(mockTagRepo({ search }));

            await service.search({ type: "user", userId: "123" }, "gre");
            expect(search).toHaveBeenCalledWith(null, "123", "gre");
        });
    });

    describe("delete", () => {
        it("deletes guild tags via deleteGuildTag", async () => {
            const deleteGuildTag = vi.fn().mockResolvedValue(undefined);
            const service = new TagService(mockTagRepo({ deleteGuildTag }));

            await service.delete({ type: "guild", guildId: "456" }, "t");
            expect(deleteGuildTag).toHaveBeenCalledWith("456", "t");
        });

        it("deletes user tags via deleteUserTag", async () => {
            const deleteUserTag = vi.fn().mockResolvedValue(undefined);
            const service = new TagService(mockTagRepo({ deleteUserTag }));

            await service.delete({ type: "user", userId: "123" }, "t");
            expect(deleteUserTag).toHaveBeenCalledWith("123", "t");
        });
    });

    describe("web API passthroughs", () => {
        it("deleteById delegates to the repository", async () => {
            const deleteById = vi.fn().mockResolvedValue(undefined);
            const service = new TagService(mockTagRepo({ deleteById }));

            await service.deleteById(8);
            expect(deleteById).toHaveBeenCalledWith(8);
        });

        it("updateContent patches only the message field", async () => {
            const updated = makeTag({ message: "new" });
            const updateById = vi.fn().mockResolvedValue(updated);
            const service = new TagService(mockTagRepo({ updateById }));

            const result = await service.updateContent(8, "new");
            expect(result).toEqual(updated);
            expect(updateById).toHaveBeenCalledWith(8, { message: "new" });
        });
    });
});
