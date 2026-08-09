import { describe, it, expect, beforeAll, afterAll } from "vitest";
import Fastify from "fastify";
import cookie from "@fastify/cookie";
import jwt from "@fastify/jwt";
import authRoutes from "./auth";

describe("auth routes", () => {
    const app = Fastify({ logger: false });

    beforeAll(async () => {
        await app.register(cookie);
        await app.register(jwt, { secret: "test-secret", cookie: { cookieName: "ninpou", signed: false } });

        // Replicate the authenticate decorator
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

        await app.register(authRoutes, { prefix: "/auth" });
        await app.ready();
    });

    afterAll(async () => {
        await app.close();
    });

    describe("POST /auth/refresh", () => {
        it("returns 401 when no token is provided", async () => {
            const res = await app.inject({ method: "POST", url: "/auth/refresh" });
            expect(res.statusCode).toBe(401);
        });

        it("returns 401 for an invalid token", async () => {
            const res = await app.inject({
                method: "POST",
                url: "/auth/refresh",
                headers: { cookie: "ninpou=invalid-token" },
            });
            expect(res.statusCode).toBe(401);
        });

        it("returns 401 for a valid token when user does not exist in DB", async () => {
            const token = await app.jwt.sign({ id: 99999, uid: "ghost", aud: "izuna" });

            const res = await app.inject({
                method: "POST",
                url: "/auth/refresh",
                headers: { cookie: `ninpou=${token}` },
            });

            // Valid JWT, but userRepo.findById returns null → 401
            expect(res.statusCode).toBe(401);
            expect(res.json().error).toBe("User not found");
        });
    });

    describe("GET /auth/me", () => {
        it("returns 401 without a valid token", async () => {
            const res = await app.inject({ method: "GET", url: "/auth/me" });
            expect(res.statusCode).toBe(401);
        });

        it("returns 404 for a valid token when user does not exist in DB", async () => {
            const token = await app.jwt.sign({ id: 99999, uid: "ghost", aud: "izuna" });

            const res = await app.inject({
                method: "GET",
                url: "/auth/me",
                headers: { cookie: `ninpou=${token}` },
            });

            expect(res.statusCode).toBe(404);
        });
    });
});
