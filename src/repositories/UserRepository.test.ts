import { describe, it, expect } from "vitest";
import type { User } from "@prisma/client";
import { UserRepository } from "./UserRepository";
import { mockPrismaClient } from "../test/helpers";

function makeUser(overrides: Partial<User> = {}): User {
    return {
        id: overrides.id ?? 1,
        uid: overrides.uid ?? "123",
        name: overrides.name ?? "test",
        email: overrides.email ?? "",
        createdAt: overrides.createdAt ?? new Date(),
        updatedAt: overrides.updatedAt ?? new Date(),
        discordAccessToken: overrides.discordAccessToken ?? null,
        discordRefreshToken: overrides.discordRefreshToken ?? null,
    };
}

function makeRepo() {
    const { prisma, delegate: user } = mockPrismaClient("user", ["findUnique", "create", "update"]);
    return { repo: new UserRepository(prisma), user };
}

describe("UserRepository", () => {
    describe("findById", () => {
        it("returns a user when found", async () => {
            const { repo, user } = makeRepo();
            const expected = makeUser();
            user.findUnique.mockResolvedValue(expected);

            const result = await repo.findById(1);
            expect(result).toEqual(expected);
            expect(user.findUnique).toHaveBeenCalledWith({ where: { id: 1 } });
        });

        it("returns null when not found", async () => {
            const { repo, user } = makeRepo();
            user.findUnique.mockResolvedValue(null);

            const result = await repo.findById(999);
            expect(result).toBeNull();
        });
    });

    describe("findByUid", () => {
        it("queries by the Discord uid unique key", async () => {
            const { repo, user } = makeRepo();
            const expected = makeUser({ uid: "discord-9" });
            user.findUnique.mockResolvedValue(expected);

            const result = await repo.findByUid("discord-9");
            expect(result).toEqual(expected);
            expect(user.findUnique).toHaveBeenCalledWith({ where: { uid: "discord-9" } });
        });
    });

    describe("create", () => {
        it("stores uid/name/email", async () => {
            const { repo, user } = makeRepo();
            const created = makeUser({ uid: "discord-9", name: "alice" });
            user.create.mockResolvedValue(created);

            const result = await repo.create({ uid: "discord-9", name: "alice", email: "a@b.c" });
            expect(result).toEqual(created);
            const call = user.create.mock.calls[0]![0]!;
            expect(call.data).toMatchObject({ uid: "discord-9", name: "alice", email: "a@b.c" });
        });

        it("defaults email to empty string", async () => {
            const { repo, user } = makeRepo();
            user.create.mockResolvedValue(makeUser());

            await repo.create({ uid: "discord-9", name: "alice", email: "" });
            const call = user.create.mock.calls[0]![0]!;
            expect(call.data.email).toBe("");
        });
    });

    describe("findOrCreateFromDiscord", () => {
        it("returns existing user without creating", async () => {
            const { repo, user } = makeRepo();
            const existing = makeUser({ uid: "123", name: "existing" });
            user.findUnique.mockResolvedValue(existing);

            const result = await repo.findOrCreateFromDiscord({ id: "123", username: "existing", email: "" });
            expect(result).toEqual(existing);
            expect(user.create).not.toHaveBeenCalled();
        });

        it("creates a new user when none exists", async () => {
            const { repo, user } = makeRepo();
            const created = makeUser({ id: 2, uid: "456", name: "new" });
            user.findUnique.mockResolvedValue(null);
            user.create.mockResolvedValue(created);

            const result = await repo.findOrCreateFromDiscord({ id: "456", username: "new", email: "n@e.w" });
            expect(result).toEqual(created);
            const call = user.create.mock.calls[0]![0]!;
            expect(call.data).toMatchObject({ uid: "456", name: "new", email: "n@e.w" });
        });
    });

    describe("updateDiscordTokens", () => {
        it("updates tokens and returns user", async () => {
            const { repo, user } = makeRepo();
            const updated = makeUser({ discordAccessToken: "at", discordRefreshToken: "rt" });
            user.update.mockResolvedValue(updated);

            const result = await repo.updateDiscordTokens(1, "at", "rt");
            expect(result).toEqual(updated);
            expect(user.update).toHaveBeenCalledWith({
                where: { id: 1 },
                data: { discordAccessToken: "at", discordRefreshToken: "rt" },
            });
        });
    });

    describe("token getters", () => {
        it("getDiscordAccessToken returns the token when the user exists", async () => {
            const { repo, user } = makeRepo();
            user.findUnique.mockResolvedValue({ discordAccessToken: "at" });

            const result = await repo.getDiscordAccessToken("123");
            expect(result).toBe("at");
            expect(user.findUnique).toHaveBeenCalledWith({ where: { uid: "123" }, select: { discordAccessToken: true } });
        });

        it("getDiscordAccessToken returns null when user is missing or token is null", async () => {
            const { repo, user } = makeRepo();
            user.findUnique.mockResolvedValueOnce(null);
            expect(await repo.getDiscordAccessToken("123")).toBeNull();

            user.findUnique.mockResolvedValueOnce({ discordAccessToken: null });
            expect(await repo.getDiscordAccessToken("123")).toBeNull();
        });

        it("getDiscordRefreshToken returns the token when the user exists", async () => {
            const { repo, user } = makeRepo();
            user.findUnique.mockResolvedValue({ discordRefreshToken: "rt" });

            const result = await repo.getDiscordRefreshToken("123");
            expect(result).toBe("rt");
            expect(user.findUnique).toHaveBeenCalledWith({ where: { uid: "123" }, select: { discordRefreshToken: true } });
        });
    });
});
