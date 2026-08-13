import { describe, it, expect, vi } from "vitest";
import { UserService } from "./UserService";
import { UserRepository } from "../repositories/UserRepository";
import type { User } from "@prisma/client";

function makeUser(overrides: Partial<User> = {}): User {
    return {
        id: overrides.id ?? 1,
        uid: overrides.uid ?? "123",
        name: overrides.name ?? "test",
        email: overrides.email ?? "",
        dateCreated: overrides.dateCreated ?? new Date(),
        createdAt: overrides.createdAt ?? new Date(),
        updatedAt: overrides.updatedAt ?? new Date(),
        discordAccessToken: overrides.discordAccessToken ?? null,
        discordRefreshToken: overrides.discordRefreshToken ?? null,
    };
}

function mockUserRepo(overrides: Partial<UserRepository> = {}): UserRepository {
    return {
        findById: vi.fn().mockResolvedValue(null),
        findByUid: vi.fn().mockResolvedValue(null),
        create: vi.fn(),
        findOrCreateFromDiscord: vi.fn(),
        updateDiscordTokens: vi.fn(),
        getDiscordAccessToken: vi.fn().mockResolvedValue(null),
        getDiscordRefreshToken: vi.fn().mockResolvedValue(null),
        ...overrides,
    } as unknown as UserRepository;
}

describe("UserService", () => {
    describe("getUserById", () => {
        it("delegates to the repository and returns the user", async () => {
            const expected = makeUser();
            const repo = mockUserRepo({ findById: vi.fn().mockResolvedValue(expected) });
            const service = new UserService(repo);

            const result = await service.getUserById(1);
            expect(result).toEqual(expected);
            expect(repo.findById).toHaveBeenCalledWith(1);
        });

        it("throws a wrapped error when the repository fails", async () => {
            const repo = mockUserRepo({ findById: vi.fn().mockRejectedValue(new Error("DB down")) });
            const service = new UserService(repo);

            await expect(service.getUserById(1)).rejects.toThrow("Failed to fetch user");
        });
    });

    describe("getUserByUid", () => {
        it("delegates to findByUid", async () => {
            const expected = makeUser({ uid: "abc" });
            const repo = mockUserRepo({ findByUid: vi.fn().mockResolvedValue(expected) });
            const service = new UserService(repo);

            const result = await service.getUserByUid("abc");
            expect(result).toEqual(expected);
            expect(repo.findByUid).toHaveBeenCalledWith("abc");
        });

        it("throws a wrapped error on failure", async () => {
            const repo = mockUserRepo({ findByUid: vi.fn().mockRejectedValue(new Error("DB down")) });
            const service = new UserService(repo);

            await expect(service.getUserByUid("abc")).rejects.toThrow("Failed to fetch user");
        });
    });

    describe("findOrCreateUser", () => {
        it("delegates to findOrCreateFromDiscord", async () => {
            const expected = makeUser({ uid: "456", name: "discordUser" });
            const repo = mockUserRepo({ findOrCreateFromDiscord: vi.fn().mockResolvedValue(expected) });
            const service = new UserService(repo);

            const result = await service.findOrCreateUser({ id: "456", username: "discordUser", email: "e@mail" });
            expect(result).toEqual(expected);
            expect(repo.findOrCreateFromDiscord).toHaveBeenCalledWith({ id: "456", username: "discordUser", email: "e@mail" });
        });

        it("throws a wrapped error on failure", async () => {
            const repo = mockUserRepo({ findOrCreateFromDiscord: vi.fn().mockRejectedValue(new Error("DB down")) });
            const service = new UserService(repo);

            await expect(service.findOrCreateUser({ id: "456", username: "u" })).rejects.toThrow("Failed to find or create user");
        });
    });

    describe("updateDiscordTokens", () => {
        it("passes both tokens through to the repository", async () => {
            const expected = makeUser({ discordAccessToken: "at", discordRefreshToken: "rt" });
            const repo = mockUserRepo({ updateDiscordTokens: vi.fn().mockResolvedValue(expected) });
            const service = new UserService(repo);

            const result = await service.updateDiscordTokens(1, "at", "rt");
            expect(result).toEqual(expected);
            expect(repo.updateDiscordTokens).toHaveBeenCalledWith(1, "at", "rt");
        });

        it("throws a wrapped error on failure", async () => {
            const repo = mockUserRepo({ updateDiscordTokens: vi.fn().mockRejectedValue(new Error("DB down")) });
            const service = new UserService(repo);

            await expect(service.updateDiscordTokens(1, "at", "rt")).rejects.toThrow("Failed to update Discord tokens");
        });
    });

    describe("getDiscordAccessToken", () => {
        it("returns the token string when found", async () => {
            const repo = mockUserRepo({ getDiscordAccessToken: vi.fn().mockResolvedValue("my-token") });
            const service = new UserService(repo);

            const result = await service.getDiscordAccessToken("123");
            expect(result).toBe("my-token");
        });

        it("returns null when the repository throws", async () => {
            const repo = mockUserRepo({ getDiscordAccessToken: vi.fn().mockRejectedValue(new Error("DB down")) });
            const service = new UserService(repo);

            const result = await service.getDiscordAccessToken("123");
            expect(result).toBeNull();
        });
    });
});
