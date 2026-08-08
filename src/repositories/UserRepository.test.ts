import { describe, it, expect, vi } from "vitest";
import { UserRepository } from "./UserRepository";
import type { PrismaClient } from "@prisma/client";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mockPrisma(overrides: Record<string, any> = {}): PrismaClient {
    const user = {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        ...overrides.user,
    };
    return { ...overrides, user } as unknown as PrismaClient;
}

function makeUser(overrides: { id?: number; uid?: string; name?: string; discordAccessToken?: string | null; discordRefreshToken?: string | null } = {}) {
    return {
        id: overrides.id ?? 1,
        uid: overrides.uid ?? "123",
        name: overrides.name ?? "test",
        email: "",
        dateCreated: new Date(),
        discordAccessToken: overrides.discordAccessToken ?? null,
        discordRefreshToken: overrides.discordRefreshToken ?? null,
    };
}

describe("UserRepository", () => {
    describe("findById", () => {
        it("returns a user when found", async () => {
            const expected = makeUser();
            const prisma = mockPrisma({ user: { findUnique: vi.fn().mockResolvedValue(expected) } });
            const repo = new UserRepository(prisma);

            const result = await repo.findById(1);
            expect(result).toEqual(expected);
            expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { id: 1 } });
        });

        it("returns null when not found", async () => {
            const prisma = mockPrisma({ user: { findUnique: vi.fn().mockResolvedValue(null) } });
            const repo = new UserRepository(prisma);

            const result = await repo.findById(999);
            expect(result).toBeNull();
        });
    });

    describe("findOrCreateFromDiscord", () => {
        it("returns existing user when found", async () => {
            const existing = makeUser({ uid: "123", name: "existing" });
            const prisma = mockPrisma({ user: { findUnique: vi.fn().mockResolvedValue(existing) } });
            const repo = new UserRepository(prisma);

            const result = await repo.findOrCreateFromDiscord({ id: "123", username: "existing", email: "" });
            expect(result).toEqual(existing);
            expect(prisma.user.create).not.toHaveBeenCalled();
        });

        it("creates new user when not found", async () => {
            const created = makeUser({ id: 2, uid: "456", name: "new" });
            const prisma = mockPrisma({
                user: {
                    findUnique: vi.fn().mockResolvedValue(null),
                    create: vi.fn().mockResolvedValue(created),
                },
            });
            const repo = new UserRepository(prisma);

            const result = await repo.findOrCreateFromDiscord({ id: "456", username: "new", email: "" });
            expect(result).toEqual(created);
            expect(prisma.user.create).toHaveBeenCalled();
        });
    });

    describe("updateDiscordTokens", () => {
        it("updates tokens and returns user", async () => {
            const updated = makeUser({ discordAccessToken: "at", discordRefreshToken: "rt" });
            const prisma = mockPrisma({ user: { update: vi.fn().mockResolvedValue(updated) } });
            const repo = new UserRepository(prisma);

            const result = await repo.updateDiscordTokens(1, "at", "rt");
            expect(result).toEqual(updated);
            expect(prisma.user.update).toHaveBeenCalledWith({
                where: { id: 1 },
                data: { discordAccessToken: "at", discordRefreshToken: "rt" },
            });
        });
    });
});
