import { describe, it, expect, vi } from "vitest";
import type { Shoukaku, Node } from "shoukaku";
import type { KeyValueRepository } from "../repositories/KeyValueRepository.js";
import type { LavalinkNodeManager } from "./LavalinkNodeManager.js";
import { LavalinkAdminService } from "./LavalinkAdminService.js";

function makeNode(name: string, group: string | undefined, penalties: number, state = 1): Node {
    return { name, group, penalties, state } as unknown as Node;
}

function makeService(nodes: Node[], kvValues: Record<string, unknown> = {}) {
    const kv = {
        get: vi.fn(async (key: string) => kvValues[key] ?? null),
        set: vi.fn(async () => undefined),
    } as unknown as KeyValueRepository;
    const manager = { nodes: new Map(nodes.map((n) => [n.name, n])) } as unknown as Shoukaku;
    const nodeManager = {
        effectiveTags: vi.fn((node: Node) => (node.group === "public" ? ["public"] : ["local"])),
        loadPreferences: vi.fn(async () => undefined),
        syncNodes: vi.fn(async () => undefined),
        getLastError: vi.fn((): string | null => null),
    };
    const service = new LavalinkAdminService(kv, () => manager, () => nodeManager as unknown as LavalinkNodeManager);
    return { service, kv, nodeManager, manager };
}

describe("LavalinkAdminService", () => {
    describe("getNodes", () => {
        it("maps pool nodes to status with effective tags", () => {
            const local = makeNode("local", undefined, 5);
            const pub = makeNode("public-a", "public", 1);
            const down = makeNode("down", "public", 3, 3 /* DISCONNECTED */);
            const { service } = makeService([local, pub, down]);

            expect(service.getNodes()).toEqual([
                { name: "local", group: null, state: "connected", connected: true, penalties: 5, tags: ["local"], lastError: null },
                { name: "public-a", group: "public", state: "connected", connected: true, penalties: 1, tags: ["public"], lastError: null },
                { name: "down", group: "public", state: "disconnected", connected: false, penalties: 3, tags: ["public"], lastError: null },
            ]);
        });

        it("surfaces the last connection error from the node manager", () => {
            const pub = makeNode("public-a", "public", 1, 3 /* DISCONNECTED */);
            const { service, nodeManager } = makeService([pub]);
            nodeManager.getLastError.mockReturnValue("Rejected with HTTP 429");

            const [status] = service.getNodes();

            expect(status.lastError).toBe("Rejected with HTTP 429");
            expect(nodeManager.getLastError).toHaveBeenCalledWith("public-a");
        });

        it("returns an empty list when the manager is absent", () => {
            const kv = { get: vi.fn(), set: vi.fn() } as unknown as KeyValueRepository;
            const service = new LavalinkAdminService(kv, () => undefined, () => undefined);
            expect(service.getNodes()).toEqual([]);
        });
    });

    describe("getPreferences", () => {
        it("returns defaults when the KV store is empty", async () => {
            const { service } = makeService([]);
            const prefs = await service.getPreferences();
            expect(prefs.sourceTags.youtube).toEqual(["public"]);
            expect(prefs.sourceTags.http).toEqual(["local", "public"]);
            expect(prefs.nodeTags).toEqual({});
        });

        it("returns stored preferences when present", async () => {
            const stored = {
                "lavalink:source-tags": { youtube: ["premium"] },
                "lavalink:node-tags": { local: ["premium"] },
            };
            const { service } = makeService([], stored);
            expect(await service.getPreferences()).toEqual({
                sourceTags: { youtube: ["premium"] },
                nodeTags: { local: ["premium"] },
            });
        });
    });

    describe("updatePreferences", () => {
        it("writes both keys and reloads the node manager", async () => {
            const { service, kv, nodeManager } = makeService([]);
            const result = await service.updatePreferences({
                sourceTags: { youtube: ["premium"], default: ["public"] },
                nodeTags: { local: ["premium"] },
            });
            expect(kv.set).toHaveBeenCalledWith("lavalink:source-tags", { youtube: ["premium"], default: ["public"] });
            expect(kv.set).toHaveBeenCalledWith("lavalink:node-tags", { local: ["premium"] });
            expect(nodeManager.loadPreferences).toHaveBeenCalled();
            expect(result.sourceTags.youtube).toEqual(["premium"]);
        });

        it("merges partial updates against current preferences", async () => {
            const { service, kv } = makeService([], { "lavalink:source-tags": { http: ["local"] } });
            const result = await service.updatePreferences({ nodeTags: { a: ["x"] } });
            expect(kv.set).toHaveBeenCalledWith("lavalink:source-tags", { http: ["local"] });
            expect(kv.set).toHaveBeenCalledWith("lavalink:node-tags", { a: ["x"] });
            expect(result.sourceTags.http).toEqual(["local"]);
            expect(result.nodeTags).toEqual({ a: ["x"] });
        });
    });

    describe("syncNodes", () => {
        it("delegates to the node manager", async () => {
            const { service, nodeManager } = makeService([]);
            await service.syncNodes();
            expect(nodeManager.syncNodes).toHaveBeenCalled();
        });
    });
});
