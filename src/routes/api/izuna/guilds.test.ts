import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from "vitest";
import Fastify from "fastify";
import cookie from "@fastify/cookie";
import jwt from "@fastify/jwt";
import guildRoutes from "./guilds.js";

const sharedSession = vi.hoisted(() => new Map<string, Array<{ name: string; guildId: string; isAdmin: boolean; permissionInteger: number; guildPartial: unknown }>>());

vi.mock("../../../lib/session", () => ({
    default: sharedSession,
    discordAccessTokens: new Map(),
    oauthSessionState: new Set(),
}));

const { mockTagList, mockTagGetById, mockTagDeleteById } = vi.hoisted(() => ({
    mockTagList: vi.fn(),
    mockTagGetById: vi.fn(),
    mockTagDeleteById: vi.fn(),
}));

vi.mock("../../../services/TagService", () => ({
    TagService: {
        getInstance: () => ({
            list: mockTagList,
            getById: mockTagGetById,
            deleteById: mockTagDeleteById,
        }),
    },
}));

describe("guild routes", () => {
    const app = Fastify({ logger: false });

    beforeAll(async () => {
        await app.register(cookie);
        await app.register(jwt, { secret: "test-secret", cookie: { cookieName: "ninpou", signed: false } });
        app.decorate(
            "authenticate",
            async function (request: { jwtVerify: () => Promise<void> }, reply: { status: (code: number) => { send: (b: unknown) => void } }) {
                try { await request.jwtVerify(); } catch { reply.status(401).send({ error: "Unauthorized" }); }
            },
        );
        await app.register(guildRoutes, { prefix: "/guilds" });
        await app.ready();
    });

    afterAll(async () => { await app.close(); });

    async function authHeaders(): Promise<Record<string, string>> {
        const token = await app.jwt.sign({ id: 1, uid: "test-user", aud: "izuna" });
        return { cookie: `ninpou=${token}` };
    }

    function setGuildMembership(guildId: string, isAdmin = false) {
        sharedSession.set("test-user", [{ name: "G", guildId, isAdmin, permissionInteger: 0, guildPartial: {} }]);
    }

    beforeEach(() => { sharedSession.clear(); });

    describe("GET /guilds/:guildId/tags", () => {
        it("returns 403 when user is not a member", async () => {
            const res = await app.inject({ method: "GET", url: "/guilds/unk/tags", headers: await authHeaders() });
            expect(res.statusCode).toBe(403);
        });
        it("returns 200 with tags when user is a member", async () => {
            setGuildMembership("g1");
            mockTagList.mockResolvedValue([{ id: 1, name: "t" }]);
            const res = await app.inject({ method: "GET", url: "/guilds/g1/tags", headers: await authHeaders() });
            expect(res.statusCode).toBe(200);
            expect(mockTagList).toHaveBeenCalledWith({ type: "guild", guildId: "g1" });
        });
    });

    describe("DELETE /guilds/:guildId/tags/:id", () => {
        it("returns 403 when user is not admin", async () => {
            setGuildMembership("g1", false);
            const res = await app.inject({ method: "DELETE", url: "/guilds/g1/tags/1", headers: await authHeaders() });
            expect(res.statusCode).toBe(403);
        });
        it("returns 204 when admin deletes tag", async () => {
            setGuildMembership("g1", true);
            mockTagGetById.mockResolvedValue({ id: 1, guildId: "g1", name: "t" });
            mockTagDeleteById.mockResolvedValue(undefined);
            const res = await app.inject({ method: "DELETE", url: "/guilds/g1/tags/1", headers: await authHeaders() });
            expect(res.statusCode).toBe(204);
            expect(mockTagDeleteById).toHaveBeenCalledWith(1);
        });
    });
});
