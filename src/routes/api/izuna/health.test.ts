import { describe, it, expect, beforeAll, afterAll } from "vitest";
import Fastify from "fastify";
import healthRoutes from "./health";

describe("GET /api/izuna/health", () => {
    const app = Fastify({ logger: false });

    beforeAll(async () => {
        await app.register(healthRoutes, { prefix: "/health" });
        await app.ready();
    });

    afterAll(async () => {
        await app.close();
    });

    it("returns 200 with status ok and version", async () => {
        const res = await app.inject({ method: "GET", url: "/health" });

        expect(res.statusCode).toBe(200);
        const body = res.json();
        expect(body.status).toBe("ok");
        expect(body.version).toBe("0.0.1");
    });
});
