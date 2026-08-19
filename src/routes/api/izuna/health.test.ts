import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import Fastify from "fastify";
import healthRoutes from "./health.js";
import type { HealthService } from "../../../services/HealthService.js";

describe("health routes", () => {
    const app = Fastify({ logger: false });
    const check = vi.fn();

    beforeAll(async () => {
        await app.register(healthRoutes, {
            prefix: "/health",
            healthService: { check } as unknown as HealthService,
        });
        await app.ready();
    });

    afterAll(async () => {
        await app.close();
    });

    it("GET /health returns 200 liveness", async () => {
        const res = await app.inject({ method: "GET", url: "/health" });
        expect(res.statusCode).toBe(200);
        expect(res.json()).toMatchObject({ status: "ok", version: "0.0.1" });
    });

    it("GET /health/ready returns 200 when ready", async () => {
        check.mockResolvedValue({ status: "ok", checks: {} });
        const res = await app.inject({ method: "GET", url: "/health/ready" });
        expect(res.statusCode).toBe(200);
        expect(res.json().status).toBe("ok");
    });

    it("GET /health/ready returns 503 when degraded", async () => {
        check.mockResolvedValue({ status: "degraded", checks: {} });
        const res = await app.inject({ method: "GET", url: "/health/ready" });
        expect(res.statusCode).toBe(503);
        expect(res.json().status).toBe("degraded");
    });
});
