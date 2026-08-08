import { describe, it, expect } from "vitest";
import type { Tag } from "@prisma/client";
import { TagRepository } from "./TagRepository";
import { mockPrismaClient } from "../test/helpers";

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

function makeRepo() {
    const { prisma, delegate: tag } = mockPrismaClient("tag", [
        "findUnique",
        "findFirst",
        "findMany",
        "create",
        "update",
        "updateMany",
        "delete",
        "deleteMany",
    ]);
    return { repo: new TagRepository(prisma), tag };
}

describe("TagRepository", () => {
    describe("findById", () => {
        it("queries by primary key", async () => {
            const { repo, tag } = makeRepo();
            const expected = makeTag();
            tag.findUnique.mockResolvedValue(expected);

            const result = await repo.findById(7);

            expect(result).toEqual(expected);
            expect(tag.findUnique).toHaveBeenCalledWith({ where: { id: 7 } });
        });
    });

    describe("scope-scoped reads", () => {
        it("findByUser filters to user-scoped tags only", async () => {
            const { repo, tag } = makeRepo();
            tag.findMany.mockResolvedValue([]);

            await repo.findByUser("123");

            expect(tag.findMany).toHaveBeenCalledWith({ where: { userId: "123", isGuild: false } });
        });

        it("findByGuild filters to guild-scoped tags only", async () => {
            const { repo, tag } = makeRepo();
            tag.findMany.mockResolvedValue([]);

            await repo.findByGuild("456");

            expect(tag.findMany).toHaveBeenCalledWith({ where: { guildId: "456", isGuild: true } });
        });

        it("findUserTagByName scopes by user and isGuild=false", async () => {
            const { repo, tag } = makeRepo();
            tag.findFirst.mockResolvedValue(null);

            await repo.findUserTagByName("123", "greet");

            expect(tag.findFirst).toHaveBeenCalledWith({ where: { userId: "123", isGuild: false, name: "greet" } });
        });

        it("findGuildTagByName scopes by guild and isGuild=true", async () => {
            const { repo, tag } = makeRepo();
            tag.findFirst.mockResolvedValue(null);

            await repo.findGuildTagByName("456", "greet");

            expect(tag.findFirst).toHaveBeenCalledWith({ where: { guildId: "456", isGuild: true, name: "greet" } });
        });

        it("findGuildsWithTags uses an in-query over guild ids", async () => {
            const { repo, tag } = makeRepo();
            tag.findMany.mockResolvedValue([]);

            await repo.findGuildsWithTags(["a", "b"]);

            expect(tag.findMany).toHaveBeenCalledWith({ where: { guildId: { in: ["a", "b"] } } });
        });
    });

    describe("search", () => {
        it("searches guild-scoped tags by name prefix when guildId given", async () => {
            const { repo, tag } = makeRepo();
            tag.findMany.mockResolvedValue([]);

            await repo.search("456", "ignored", "gre");

            expect(tag.findMany).toHaveBeenCalledWith({ where: { guildId: "456", isGuild: true, name: { startsWith: "gre" } } });
        });

        it("searches user-scoped tags by name prefix when guildId is null", async () => {
            const { repo, tag } = makeRepo();
            tag.findMany.mockResolvedValue([]);

            await repo.search(null, "123", "gre");

            expect(tag.findMany).toHaveBeenCalledWith({ where: { userId: "123", isGuild: false, name: { startsWith: "gre" } } });
        });
    });

    describe("writes", () => {
        it("create passes data through to prisma", async () => {
            const { repo, tag } = makeRepo();
            const data = { userId: "123", guildId: "", name: "t", dateCreated: new Date(), message: "m", isMedia: false, isGuild: false };
            tag.create.mockResolvedValue(makeTag(data));

            await repo.create(data);

            expect(tag.create).toHaveBeenCalledWith({ data });
        });

        it("updateById updates only message/isMedia fields", async () => {
            const { repo, tag } = makeRepo();
            tag.update.mockResolvedValue(makeTag());

            await repo.updateById(3, { message: "new" });

            expect(tag.update).toHaveBeenCalledWith({ where: { id: 3 }, data: { message: "new" } });
        });
    });

    describe("upsertGuildTag", () => {
        it("updates in place and returns the refreshed row when the tag exists", async () => {
            const { repo, tag } = makeRepo();
            const existing = makeTag({ id: 1, guildId: "456", name: "t", isGuild: true, message: "old" });
            const updated = makeTag({ ...existing, message: "new" });
            // findFirst is called twice: existence check, then re-fetch after updateMany
            tag.findFirst.mockResolvedValueOnce(existing).mockResolvedValueOnce(updated);
            tag.updateMany.mockResolvedValue({ count: 1 });
            const data = { userId: "123", guildId: "456", name: "t", dateCreated: new Date(), message: "new", isMedia: false, isGuild: true };

            const result = await repo.upsertGuildTag("456", "t", data);

            expect(result).toEqual(updated);
            expect(tag.updateMany).toHaveBeenCalledWith({ where: { guildId: "456", isGuild: true, name: "t" }, data });
            expect(tag.create).not.toHaveBeenCalled();
        });

        it("creates with guild scope when the tag does not exist", async () => {
            const { repo, tag } = makeRepo();
            tag.findFirst.mockResolvedValue(null);
            const created = makeTag({ id: 9, guildId: "456", name: "t", isGuild: true });
            tag.create.mockResolvedValue(created);
            const data = { userId: "123", guildId: "", name: "t", dateCreated: new Date(), message: "m", isMedia: false, isGuild: false };

            const result = await repo.upsertGuildTag("456", "t", data);

            expect(result).toEqual(created);
            expect(tag.create).toHaveBeenCalledWith({ data: { ...data, guildId: "456", isGuild: true } });
            expect(tag.updateMany).not.toHaveBeenCalled();
        });
    });

    describe("upsertUserTag", () => {
        it("updates in place when the user tag exists", async () => {
            const { repo, tag } = makeRepo();
            const existing = makeTag({ id: 1, userId: "123", name: "t", isGuild: false, message: "old" });
            const updated = makeTag({ ...existing, message: "new" });
            tag.findFirst.mockResolvedValueOnce(existing).mockResolvedValueOnce(updated);
            tag.updateMany.mockResolvedValue({ count: 1 });
            const data = { userId: "123", guildId: "", name: "t", dateCreated: new Date(), message: "new", isMedia: false, isGuild: false };

            const result = await repo.upsertUserTag("123", "t", data);

            expect(result).toEqual(updated);
            expect(tag.updateMany).toHaveBeenCalledWith({ where: { userId: "123", isGuild: false, name: "t" }, data });
            expect(tag.create).not.toHaveBeenCalled();
        });

        it("creates with user scope when the tag does not exist", async () => {
            const { repo, tag } = makeRepo();
            tag.findFirst.mockResolvedValue(null);
            const created = makeTag({ id: 9, userId: "123", name: "t", isGuild: false });
            tag.create.mockResolvedValue(created);
            const data = { userId: "123", guildId: "456", name: "t", dateCreated: new Date(), message: "m", isMedia: false, isGuild: true };

            const result = await repo.upsertUserTag("123", "t", data);

            expect(result).toEqual(created);
            // user scope must override whatever scope flags the payload carried
            expect(tag.create).toHaveBeenCalledWith({ data: { ...data, userId: "123", isGuild: false } });
            expect(tag.updateMany).not.toHaveBeenCalled();
        });
    });

    describe("deletes", () => {
        it("deleteById deletes by primary key", async () => {
            const { repo, tag } = makeRepo();
            tag.delete.mockResolvedValue(makeTag());

            await repo.deleteById(5);

            expect(tag.delete).toHaveBeenCalledWith({ where: { id: 5 } });
        });

        it("deleteGuildTag scopes the deleteMany to the guild", async () => {
            const { repo, tag } = makeRepo();
            tag.deleteMany.mockResolvedValue({ count: 1 });

            await repo.deleteGuildTag("456", "t");

            expect(tag.deleteMany).toHaveBeenCalledWith({ where: { guildId: "456", isGuild: true, name: "t" } });
        });

        it("deleteUserTag scopes the deleteMany to the user", async () => {
            const { repo, tag } = makeRepo();
            tag.deleteMany.mockResolvedValue({ count: 1 });

            await repo.deleteUserTag("123", "t");

            expect(tag.deleteMany).toHaveBeenCalledWith({ where: { userId: "123", isGuild: false, name: "t" } });
        });
    });
});
