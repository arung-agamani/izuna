import { describe, it, expect, vi, beforeEach } from "vitest";
import { AuthService } from "./AuthService";
import { UserRepository } from "../repositories/UserRepository";
import { discordAccessTokens } from "../lib/session";
import type { User } from "@prisma/client";
import type { DiscordTokens } from "./AuthService";

function makeUser(overrides: Partial<User> = {}): User {
    return {
        id: overrides.id ?? 1,
        uid: overrides.uid ?? "123",
        name: overrides.name ?? "test",
        email: overrides.email ?? "",
        dateCreated: overrides.dateCreated ?? new Date(),
        discordAccessToken: overrides.discordAccessToken ?? null,
        discordRefreshToken: overrides.discordRefreshToken ?? null,
    };
}

function makeTokens(overrides: Partial<DiscordTokens> = {}): DiscordTokens {
    return {
        accessToken: overrides.accessToken ?? "access-token",
        refreshToken: overrides.refreshToken ?? "refresh-token",
        expiresIn: overrides.expiresIn ?? 604800,
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

describe("AuthService", () => {
    beforeEach(() => {
        discordAccessTokens.clear();
    });

    describe("processDiscordLogin", () => {
        it("finds or creates the user, caches tokens, and persists to DB", async () => {
            const user = makeUser({ id: 1, uid: "123" });
            const repo = mockUserRepo({
                findOrCreateFromDiscord: vi.fn().mockResolvedValue(user),
                updateDiscordTokens: vi.fn().mockResolvedValue(user),
            });
            const service = new AuthService(repo);
            const tokens = makeTokens();

            const result = await service.processDiscordLogin({ id: "123", username: "test", email: "" }, tokens);

            expect(result).toEqual(user);
            expect(repo.findOrCreateFromDiscord).toHaveBeenCalledWith({ id: "123", username: "test", email: "" });
            expect(repo.updateDiscordTokens).toHaveBeenCalledWith(1, "access-token", "refresh-token");

            // In-memory cache
            const cached = discordAccessTokens.get("123");
            expect(cached).toBeDefined();
            expect(cached!.access_token).toBe("access-token");
            expect(cached!.refresh_token).toBe("refresh-token");
        });

        it("handles missing email gracefully", async () => {
            const user = makeUser({ id: 2, uid: "456" });
            const repo = mockUserRepo({
                findOrCreateFromDiscord: vi.fn().mockResolvedValue(user),
                updateDiscordTokens: vi.fn().mockResolvedValue(user),
            });
            const service = new AuthService(repo);

            await service.processDiscordLogin({ id: "456", username: "noemail" }, makeTokens());

            expect(repo.findOrCreateFromDiscord).toHaveBeenCalledWith({ id: "456", username: "noemail", email: undefined });
        });
    });

    describe("validateState", () => {
        const service = new AuthService(mockUserRepo());

        it("returns null when state is not in the set", () => {
            const stateSet = new Set<string>(["abc"]);
            expect(service.validateState("xyz", stateSet)).toBeNull();
        });

        it("decodes a valid base64+JSON state", () => {
            const state = Buffer.from(JSON.stringify({ redirect: "/home", initiator: "web" })).toString("base64");
            const stateSet = new Set([state]);

            const result = service.validateState(state, stateSet);
            expect(result).toEqual({ redirect: "/home", initiator: "web" });
        });

        it("returns null for malformed base64", () => {
            const stateSet = new Set(["!!!not-base64!!!"]);
            expect(service.validateState("!!!not-base64!!!", stateSet)).toBeNull();
        });

        it("returns null for base64 that is not valid JSON", () => {
            const bad = Buffer.from("not-json").toString("base64");
            const stateSet = new Set([bad]);
            expect(service.validateState(bad, stateSet)).toBeNull();
        });
    });

    describe("decodeRedirect", () => {
        const service = new AuthService(mockUserRepo());

        it("decodes a base64 URL", () => {
            const encoded = Buffer.from("/dashboard").toString("base64");
            expect(service.decodeRedirect(encoded)).toBe("/dashboard");
        });

        it("returns empty string for invalid base64 (Node.js base64 decoder does not throw)", () => {
            expect(service.decodeRedirect("!!!")).toBe("");
        });
    });

    describe("refreshTokens", () => {
        it("throws when user is not found", async () => {
            const repo = mockUserRepo({ findByUid: vi.fn().mockResolvedValue(null) });
            const service = new AuthService(repo);

            await expect(service.refreshTokens("123", makeTokens())).rejects.toThrow("User not found");
        });

        it("updates the in-memory cache and persists to DB", async () => {
            const user = makeUser({ id: 1, uid: "123" });
            const repo = mockUserRepo({
                findByUid: vi.fn().mockResolvedValue(user),
                updateDiscordTokens: vi.fn().mockResolvedValue(user),
            });
            const service = new AuthService(repo);
            const tokens = makeTokens({ accessToken: "new-at", refreshToken: "new-rt" });

            await service.refreshTokens("123", tokens);

            expect(repo.updateDiscordTokens).toHaveBeenCalledWith(1, "new-at", "new-rt");

            const cached = discordAccessTokens.get("123");
            expect(cached!.access_token).toBe("new-at");
            expect(cached!.refresh_token).toBe("new-rt");
        });
    });
});
