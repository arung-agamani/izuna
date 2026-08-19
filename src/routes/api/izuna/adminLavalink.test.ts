import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from "vitest";
import Fastify from "fastify";
import adminLavalinkRoutes from "./adminLavalink.js";
import type { LavalinkAdminService } from "../../../services/LavalinkAdminService.js";

describe("admin lavalink routes", () => {
    const app = Fastify({ logger: false });
    const service = {
        getNodes: vi.fn(),
        getPreferences: vi.fn(),
        updatePreferences: vi.fn(),
        syncNodes: vi.fn(),
    };

    beforeAll(async () => {
        app.decorate("adminRequired", async () => undefined);
        await app.register(adminLavalinkRoutes, { prefix: "/admin/lavalink", lavalinkAdminService: service as unknown as LavalinkAdminService });
        await app.ready();
    });

    afterAll(async () => {
        await app.close();
    });

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("GET /nodes returns the node status list", async () => {
        service.getNodes.mockReturnValue([{ name: "local", group: null, connected: true, penalties: 5, tags: ["local"] }]);

        const res = await app.inject({ method: "GET", url: "/admin/lavalink/nodes" });

        expect(res.statusCode).toBe(200);
        expect(res.json()).toEqual({
            data: [{ name: "local", group: null, connected: true, penalties: 5, tags: ["local"] }],
            count: 1,
        });
    });

    it("GET /preferences returns preferences", async () => {
        service.getPreferences.mockResolvedValue({ sourceTags: { youtube: ["public"] }, nodeTags: {} });

        const res = await app.inject({ method: "GET", url: "/admin/lavalink/preferences" });

        expect(res.statusCode).toBe(200);
        expect(res.json().data.sourceTags.youtube).toEqual(["public"]);
    });

    it("PUT /preferences updates and returns preferences", async () => {
        service.updatePreferences.mockResolvedValue({ sourceTags: { youtube: ["premium"] }, nodeTags: {} });

        const res = await app.inject({
            method: "PUT",
            url: "/admin/lavalink/preferences",
            payload: { sourceTags: { youtube: ["premium"] } },
        });

        expect(res.statusCode).toBe(200);
        expect(service.updatePreferences).toHaveBeenCalledWith({ sourceTags: { youtube: ["premium"] } });
        expect(res.json().data.sourceTags.youtube).toEqual(["premium"]);
    });

    it("PUT /preferences rejects malformed payloads with 400", async () => {
        const res = await app.inject({
            method: "PUT",
            url: "/admin/lavalink/preferences",
            payload: { sourceTags: { youtube: "not-an-array" } },
        });

        expect(res.statusCode).toBe(400);
        expect(service.updatePreferences).not.toHaveBeenCalled();
    });

    it("POST /sync triggers a node pool sync", async () => {
        service.syncNodes.mockResolvedValue(undefined);

        const res = await app.inject({ method: "POST", url: "/admin/lavalink/sync" });

        expect(res.statusCode).toBe(200);
        expect(res.json()).toEqual({ data: { synced: true } });
        expect(service.syncNodes).toHaveBeenCalled();
    });
});
