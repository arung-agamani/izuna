import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import Fastify from "fastify";
import cookie from "@fastify/cookie";
import jwt from "@fastify/jwt";
import userRoutes from "./users";

// Hoisted — accessible inside vi.mock factories
const {
    mockTagList,
    mockTagGetById,
    mockTagValidateName,
    mockTagUpsertText,
    mockTagUpdateContent,
    mockTagDeleteById,
    mockReminderList,
    mockReminderGetForUser,
    mockReminderCreate,
    mockReminderUpdate,
    mockReminderDelete,
    mockReminderValidateCron,
} = vi.hoisted(() => ({
    mockTagList: vi.fn(),
    mockTagGetById: vi.fn(),
    mockTagValidateName: vi.fn(),
    mockTagUpsertText: vi.fn(),
    mockTagUpdateContent: vi.fn(),
    mockTagDeleteById: vi.fn(),
    mockReminderList: vi.fn(),
    mockReminderGetForUser: vi.fn(),
    mockReminderCreate: vi.fn(),
    mockReminderUpdate: vi.fn(),
    mockReminderDelete: vi.fn(),
    mockReminderValidateCron: vi.fn(),
}));

vi.mock("../../../services/TagService", () => ({
    TagService: {
        getInstance: () => ({
            list: mockTagList,
            getById: mockTagGetById,
            validateName: mockTagValidateName,
            upsertTextTag: mockTagUpsertText,
            upsertMediaTag: vi.fn(),
            updateContent: mockTagUpdateContent,
            deleteById: mockTagDeleteById,
        }),
    },
}));

vi.mock("../../../services/ReminderService", () => {
    const mock = {
        getInstance: () => ({
            listReminders: mockReminderList,
            getReminderForUser: mockReminderGetForUser,
            createReminder: mockReminderCreate,
            updateReminder: mockReminderUpdate,
            deleteReminder: mockReminderDelete,
            validateCronString: mockReminderValidateCron,
        }),
    };
    return { default: mock, ...mock };
});

vi.mock("../../../lib/session", () => ({
    default: new Map(),
    discordSession: new Map(),
    discordAccessTokens: new Map(),
    oauthSessionState: new Set(),
}));

function makeTag(overrides: Record<string, unknown> = {}) {
    return {
        id: (overrides.id as number) ?? 1,
        userId: (overrides.userId as string) ?? "test-user",
        guildId: (overrides.guildId as string) ?? "",
        name: (overrides.name as string) ?? "test-tag",
        dateCreated: new Date(),
        message: (overrides.message as string) ?? "hello",
        isMedia: (overrides.isMedia as boolean) ?? false,
        isGuild: (overrides.isGuild as boolean) ?? false,
    };
}

function makeReminder(overrides: Record<string, unknown> = {}) {
    return {
        id: (overrides.id as number) ?? 1,
        uid: (overrides.uid as string) ?? "test-user",
        message: (overrides.message as string) ?? "remind me",
        cronString: (overrides.cronString as string) ?? "0 9 * * *",
        guildId: (overrides.guildId as string) ?? "",
        channelId: (overrides.channelId as string) ?? "",
        channelType: (overrides.channelType as string) ?? "DM",
    };
}

describe("user routes", () => {
    const app = Fastify({ logger: false });

    beforeAll(async () => {
        await app.register(cookie);
        await app.register(jwt, { secret: "test-secret", cookie: { cookieName: "ninpou", signed: false } });

        app.decorate(
            "authenticate",
            async function (request: { jwtVerify: () => Promise<void> }, reply: { status: (code: number) => { send: (b: unknown) => void } }) {
                try {
                    await request.jwtVerify();
                } catch {
                    reply.status(401).send({ error: "Unauthorized" });
                }
            },
        );

        await app.register(userRoutes, { prefix: "/users" });
        await app.ready();
    });

    afterAll(async () => {
        await app.close();
    });

    async function authHeaders(): Promise<Record<string, string>> {
        const token = await app.jwt.sign({ id: 1, uid: "test-user", aud: "izuna" });
        return { cookie: `ninpou=${token}` };
    }

    // ── Tags ────────────────────────────────────────────

    describe("GET /users/me/tags", () => {
        it("returns 401 without auth", async () => {
            const res = await app.inject({ method: "GET", url: "/users/me/tags" });
            expect(res.statusCode).toBe(401);
        });

        it("returns tag list for authenticated user", async () => {
            mockTagList.mockResolvedValue([makeTag(), makeTag({ id: 2, name: "second" })]);

            const res = await app.inject({ method: "GET", url: "/users/me/tags", headers: await authHeaders() });

            expect(res.statusCode).toBe(200);
            const body = res.json();
            expect(body.count).toBe(2);
            expect(body.data).toHaveLength(2);
            expect(mockTagList).toHaveBeenCalledWith({ type: "user", userId: "test-user" });
        });
    });

    describe("POST /users/me/tags", () => {
        it("returns 400 when name or content is missing", async () => {
            const res = await app.inject({
                method: "POST",
                url: "/users/me/tags",
                headers: await authHeaders(),
                payload: { name: "test" },
            });
            expect(res.statusCode).toBe(400);
        });

        it("returns 400 when name is invalid", async () => {
            mockTagValidateName.mockReturnValue(false);
            const res = await app.inject({
                method: "POST",
                url: "/users/me/tags",
                headers: await authHeaders(),
                payload: { name: "bad name!", content: "hello" },
            });
            expect(res.statusCode).toBe(400);
        });

        it("returns 201 with created tag", async () => {
            mockTagValidateName.mockReturnValue(true);
            const created = makeTag({ name: "newtag", message: "hello" });
            mockTagUpsertText.mockResolvedValue(created);

            const res = await app.inject({
                method: "POST",
                url: "/users/me/tags",
                headers: await authHeaders(),
                payload: { name: "newtag", content: "hello" },
            });

            expect(res.statusCode).toBe(201);
            expect(res.json().data).toMatchObject({ name: "newtag", message: "hello" });
            expect(mockTagUpsertText).toHaveBeenCalled();
        });
    });

    describe("GET /users/me/tags/:id", () => {
        it("returns 404 when tag not found", async () => {
            mockTagGetById.mockResolvedValue(null);
            const res = await app.inject({ method: "GET", url: "/users/me/tags/99", headers: await authHeaders() });
            expect(res.statusCode).toBe(404);
        });

        it("returns tag when found and owned", async () => {
            mockTagGetById.mockResolvedValue(makeTag({ id: 5 }));
            const res = await app.inject({ method: "GET", url: "/users/me/tags/5", headers: await authHeaders() });
            expect(res.statusCode).toBe(200);
            expect(res.json().data.id).toBe(5);
        });
    });

    describe("PATCH /users/me/tags/:id", () => {
        it("returns 400 when content is missing", async () => {
            const res = await app.inject({
                method: "PATCH",
                url: "/users/me/tags/1",
                headers: await authHeaders(),
                payload: {},
            });
            expect(res.statusCode).toBe(400);
        });

        it("returns 200 with updated tag", async () => {
            const existing = makeTag({ id: 1, message: "old" });
            const updated = makeTag({ id: 1, message: "updated" });
            mockTagGetById.mockResolvedValue(existing);
            mockTagUpdateContent.mockResolvedValue(updated);

            const res = await app.inject({
                method: "PATCH",
                url: "/users/me/tags/1",
                headers: await authHeaders(),
                payload: { content: "updated" },
            });

            expect(res.statusCode).toBe(200);
            expect(mockTagUpdateContent).toHaveBeenCalledWith(1, "updated");
        });
    });

    describe("DELETE /users/me/tags/:id", () => {
        it("returns 404 when tag does not exist", async () => {
            mockTagGetById.mockResolvedValue(null);
            const res = await app.inject({ method: "DELETE", url: "/users/me/tags/99", headers: await authHeaders() });
            expect(res.statusCode).toBe(404);
        });

        it("returns 204 on successful delete", async () => {
            mockTagGetById.mockResolvedValue(makeTag({ id: 1 }));
            mockTagDeleteById.mockResolvedValue(undefined);

            const res = await app.inject({ method: "DELETE", url: "/users/me/tags/1", headers: await authHeaders() });
            expect(res.statusCode).toBe(204);
            expect(mockTagDeleteById).toHaveBeenCalledWith(1);
        });
    });

    // ── Reminders ───────────────────────────────────────

    describe("GET /users/me/reminders", () => {
        it("returns reminder list", async () => {
            mockReminderList.mockResolvedValue([makeReminder(), makeReminder({ id: 2 })]);

            const res = await app.inject({ method: "GET", url: "/users/me/reminders", headers: await authHeaders() });

            expect(res.statusCode).toBe(200);
            const body = res.json();
            expect(body.count).toBe(2);
            expect(body.data).toHaveLength(2);
        });
    });

    describe("POST /users/me/reminders", () => {
        it("returns 400 when required fields are missing", async () => {
            const res = await app.inject({
                method: "POST",
                url: "/users/me/reminders",
                headers: await authHeaders(),
                payload: { message: "test" },
            });
            expect(res.statusCode).toBe(400);
        });

        it("returns 201 with created reminder", async () => {
            mockReminderValidateCron.mockReturnValue(true);
            mockReminderCreate.mockResolvedValue(makeReminder());

            const res = await app.inject({
                method: "POST",
                url: "/users/me/reminders",
                headers: await authHeaders(),
                payload: { message: "test", cronString: "0 9 * * *", channelType: "DM", channelId: "ch1" },
            });

            expect(res.statusCode).toBe(201);
        });
    });

    describe("GET /users/me/reminders/:id", () => {
        it("returns 404 when not found", async () => {
            mockReminderGetForUser.mockResolvedValue(null);
            const res = await app.inject({ method: "GET", url: "/users/me/reminders/99", headers: await authHeaders() });
            expect(res.statusCode).toBe(404);
        });
    });

    describe("DELETE /users/me/reminders/:id", () => {
        it("returns 404 when not found", async () => {
            mockReminderGetForUser.mockResolvedValue(null);
            const res = await app.inject({ method: "DELETE", url: "/users/me/reminders/99", headers: await authHeaders() });
            expect(res.statusCode).toBe(404);
        });
    });
});
