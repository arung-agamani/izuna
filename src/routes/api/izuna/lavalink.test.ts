import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import Fastify from "fastify";
import lavalinkRoutes from "./lavalink";

// Mock variables — accessible in both the mock factory and tests
const mockFetchNodes = vi.fn();
const mockPingTest = vi.fn();

vi.mock("../../../services/PublicLavalinkNodeService", () => ({
    PublicLavalinkNodeService: {
        get instance() {
            return { fetchNodes: mockFetchNodes, pingTest: mockPingTest };
        },
    },
    ZodPublicLavalinkNode: {
        parse: vi.fn((x: unknown) => x),
    },
}));

function makeNode(overrides: Record<string, unknown> = {}) {
    return {
        "unique-id": overrides["unique-id"] ?? "node-1",
        identifier: (overrides.identifier as string) ?? "node1",
        host: (overrides.host as string) ?? "localhost",
        port: (overrides.port as number) ?? 2333,
        password: (overrides.password as string) ?? "youshallnotpass",
        secure: (overrides.secure as boolean) ?? false,
        version: (overrides.version as string) ?? "v4.0.0",
    };
}

describe("lavalink routes", () => {
    const app = Fastify({ logger: false });

    beforeAll(async () => {
        await app.register(lavalinkRoutes, { prefix: "/lavalink" });
        await app.ready();
    });

    afterAll(async () => {
        await app.close();
    });

    describe("GET /lavalink/nodes", () => {
        it("returns 200 with node list", async () => {
            mockFetchNodes.mockResolvedValue([makeNode(), makeNode({ identifier: "node2", version: "v3.5.0" })]);

            const res = await app.inject({ method: "GET", url: "/lavalink/nodes" });

            expect(res.statusCode).toBe(200);
            const body = res.json();
            expect(body.success).toBe(true);
            expect(body.data).toHaveLength(2);
        });

        it("filters by version when ?version=v4 is passed", async () => {
            mockFetchNodes.mockResolvedValue([makeNode(), makeNode({ identifier: "node2", version: "v3.5.0" })]);

            const res = await app.inject({ method: "GET", url: "/lavalink/nodes?version=v4" });

            expect(res.statusCode).toBe(200);
            const body = res.json();
            expect(body.data).toHaveLength(1);
            expect(body.data[0].identifier).toBe("node1");
        });

        it("returns 500 when fetchNodes throws", async () => {
            mockFetchNodes.mockRejectedValue(new Error("Network error"));

            const res = await app.inject({ method: "GET", url: "/lavalink/nodes" });

            expect(res.statusCode).toBe(500);
            expect(res.json().success).toBe(false);
        });
    });

    describe("GET /lavalink/nodes/connectivity", () => {
        it("returns latency results for each node", async () => {
            mockFetchNodes.mockResolvedValue([makeNode(), makeNode({ identifier: "node2" })]);
            mockPingTest.mockResolvedValueOnce(42).mockResolvedValueOnce(87);

            const res = await app.inject({ method: "GET", url: "/lavalink/nodes/connectivity" });

            expect(res.statusCode).toBe(200);
            const body = res.json();
            expect(body.data).toHaveLength(2);
            expect(body.data[0]).toMatchObject({ identifier: "node1", latency: 42, success: true });
            expect(body.data[1]).toMatchObject({ identifier: "node2", latency: 87, success: true });
        });

        it("reports individual node failures without failing the whole request", async () => {
            mockFetchNodes.mockResolvedValue([makeNode()]);
            mockPingTest.mockRejectedValue(new Error("Connection refused"));

            const res = await app.inject({ method: "GET", url: "/lavalink/nodes/connectivity" });

            expect(res.statusCode).toBe(200);
            const body = res.json();
            expect(body.data[0].success).toBe(false);
            expect(body.data[0].latency).toBeNull();
        });
    });
});
