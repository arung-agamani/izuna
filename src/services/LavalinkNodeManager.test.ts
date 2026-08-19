import { describe, it, expect, vi } from "vitest";
import type { Shoukaku, Node } from "shoukaku";
import type { KeyValueRepository } from "../repositories/KeyValueRepository.js";
import type { PublicLavalinkNodeService, PublicLavalinkNode } from "./PublicLavalinkNodeService.js";
import { LavalinkNodeManager } from "./LavalinkNodeManager.js";

type FakeNode = { name: string; group?: string; state: number; penalties: number };

function makeNode(name: string, group: string | undefined, penalties: number, state = 1): Node {
    return { name, group, penalties, state } as unknown as Node;
}

function makePublicNode(id: string, overrides: Partial<PublicLavalinkNode> = {}): PublicLavalinkNode {
    return {
        "unique-id": id,
        identifier: `id-${id}`,
        host: `${id}.example.com`,
        port: 2333,
        password: "pass",
        secure: false,
        version: "v4",
        ...overrides,
    };
}

function makeManager(nodes: FakeNode[], kvValues: Record<string, unknown> = {}) {
    const kv = {
        get: vi.fn(async (key: string) => kvValues[key] ?? null),
        set: vi.fn(async () => undefined),
    };
    const publicNodes = { fetchNodes: vi.fn(), websocketProbe: vi.fn() };
    const manager = { nodes: new Map(nodes.map((n) => [n.name, n])), addNode: vi.fn() } as unknown as Shoukaku;
    const getManager = () => manager;
    const nodeManager = new LavalinkNodeManager(
        kv as unknown as KeyValueRepository,
        publicNodes as unknown as PublicLavalinkNodeService,
        getManager,
        3,
    );
    return { nodeManager, manager, kv, publicNodes };
}

describe("LavalinkNodeManager", () => {
    describe("resolveNode", () => {
        it("routes http sources to the local node", async () => {
            const local = makeNode("local", undefined, 5);
            const pub = makeNode("public-a", "public", 1);
            const { nodeManager } = makeManager([local, pub]);
            await nodeManager.loadPreferences();

            expect(nodeManager.resolveNode("http")).toBe(local);
        });

        it("routes youtube sources to the public node", async () => {
            const local = makeNode("local", undefined, 5);
            const pub = makeNode("public-a", "public", 1);
            const { nodeManager } = makeManager([local, pub]);
            await nodeManager.loadPreferences();

            expect(nodeManager.resolveNode("youtube")).toBe(pub);
        });

        it("picks the lowest-penalty node within a preferred tag", async () => {
            const high = makeNode("public-a", "public", 10);
            const low = makeNode("public-b", "public", 2);
            const { nodeManager } = makeManager([high, low]);
            await nodeManager.loadPreferences();

            expect(nodeManager.resolveNode("youtube")).toBe(low);
        });

        it("falls back to the lowest-penalty connected node when no tag matches", async () => {
            const local = makeNode("local", undefined, 5);
            const pub = makeNode("public-a", "public", 1);
            const { nodeManager } = makeManager([local, pub], {
                "lavalink:source-tags": { youtube: ["nope"], default: ["nope"] },
            });
            await nodeManager.loadPreferences();

            expect(nodeManager.resolveNode("youtube")).toBe(pub);
        });

        it("returns undefined when no node is connected", async () => {
            const { nodeManager } = makeManager([makeNode("down", "public", 1, 3 /* DISCONNECTED */)]);
            await nodeManager.loadPreferences();

            expect(nodeManager.resolveNode("youtube")).toBeUndefined();
        });

        it("honours a KV node-tags override over the auto tag", async () => {
            const local = makeNode("local", undefined, 5);
            const pub = makeNode("public-a", "public", 1);
            const { nodeManager } = makeManager([local, pub], {
                "lavalink:source-tags": { youtube: ["premium"], default: ["public"] },
                "lavalink:node-tags": { local: ["premium"] },
            });
            await nodeManager.loadPreferences();

            // only `local` carries "premium" via the override, so youtube prefers it
            expect(nodeManager.resolveNode("youtube")).toBe(local);
        });
    });

    describe("nodeResolver", () => {
        it("prefers non-public nodes for playback", async () => {
            const local = makeNode("local", undefined, 5);
            const pub = makeNode("public-a", "public", 1);
            const { nodeManager } = makeManager([pub, local]);
            await nodeManager.loadPreferences();

            const resolver = nodeManager.nodeResolver();
            expect(resolver(new Map([["public-a", pub], ["local", local]]))).toBe(local);
        });

        it("falls back to a public node when no local node is connected", async () => {
            const pub = makeNode("public-a", "public", 1);
            const { nodeManager } = makeManager([pub]);
            await nodeManager.loadPreferences();

            const resolver = nodeManager.nodeResolver();
            expect(resolver(new Map([["public-a", pub]]))).toBe(pub);
        });

        it("returns undefined when nothing is connected", async () => {
            const { nodeManager } = makeManager([]);
            await nodeManager.loadPreferences();

            const resolver = nodeManager.nodeResolver();
            expect(resolver(new Map())).toBeUndefined();
        });
    });

    describe("selectHealthyNodes", () => {
        it("cold start evaluates all nodes and ranks the healthy by latency", async () => {
            const nodes = [makePublicNode("a"), makePublicNode("b"), makePublicNode("c"), makePublicNode("d")];
            const { nodeManager, publicNodes, kv } = makeManager([]);
            publicNodes.websocketProbe.mockImplementation(async (n: PublicLavalinkNode) => {
                const latency: Record<string, number> = { a: 50, b: 200, c: 10 };
                const ms = latency[n["unique-id"]];
                if (ms === undefined) throw new Error("unreachable");
                return ms;
            });

            const selected = await nodeManager.selectHealthyNodes(nodes);

            expect(selected.map((n) => n["unique-id"])).toEqual(["c", "a", "b"]);
            expect(publicNodes.websocketProbe).toHaveBeenCalledTimes(4);
            expect(kv.set).toHaveBeenCalledWith(
                "lavalink:node-health",
                expect.objectContaining({
                    d: { healthy: false, latencyMs: null, lastCheckedAt: expect.any(String) },
                }),
            );
        });

        it("warm start re-checks only previously-healthy nodes", async () => {
            const nodes = [makePublicNode("a"), makePublicNode("b"), makePublicNode("c")];
            const { nodeManager, publicNodes } = makeManager([], {
                "lavalink:node-health": {
                    a: { healthy: true, latencyMs: 50, lastCheckedAt: "2026-01-01T00:00:00.000Z" },
                    b: { healthy: true, latencyMs: 100, lastCheckedAt: "2026-01-01T00:00:00.000Z" },
                    c: { healthy: false, latencyMs: null, lastCheckedAt: "2026-01-01T00:00:00.000Z" },
                },
            });
            publicNodes.websocketProbe.mockResolvedValue(10);

            const selected = await nodeManager.selectHealthyNodes(nodes);

            expect(selected.map((n) => n["unique-id"])).toEqual(["a", "b"]);
            expect(publicNodes.websocketProbe).toHaveBeenCalledTimes(2); // only a and b
        });

        it("falls back to a full evaluation when every healthy node died", async () => {
            const nodes = [makePublicNode("a"), makePublicNode("b"), makePublicNode("c")];
            const { nodeManager, publicNodes } = makeManager([], {
                "lavalink:node-health": {
                    a: { healthy: true, latencyMs: 50, lastCheckedAt: "2026-01-01T00:00:00.000Z" },
                    c: { healthy: false, latencyMs: null, lastCheckedAt: "2026-01-01T00:00:00.000Z" },
                },
            });
            publicNodes.websocketProbe.mockImplementation(async (n: PublicLavalinkNode) => {
                if (n["unique-id"] === "a") throw new Error("now dead");
                return n["unique-id"] === "b" ? 20 : 40;
            });

            const selected = await nodeManager.selectHealthyNodes(nodes);

            expect(selected.map((n) => n["unique-id"])).toEqual(["b", "c"]);
            // 1 warm re-check (a) + 3 full-eval (a, b, c)
            expect(publicNodes.websocketProbe).toHaveBeenCalledTimes(4);
        });
    });

    describe("syncNodes", () => {
        it("adds converted public nodes (bounded) and loads preferences", async () => {
            const { nodeManager, manager, publicNodes, kv } = makeManager([], { "lavalink:source-tags": { youtube: ["premium"] } });
            const nodes = [makePublicNode("a"), makePublicNode("b"), makePublicNode("c"), makePublicNode("d")];
            publicNodes.fetchNodes.mockResolvedValue(nodes);
            publicNodes.websocketProbe.mockImplementation(async (n: PublicLavalinkNode) => {
                if (n["unique-id"] === "d") throw new Error("dead");
                return 10;
            });

            await nodeManager.syncNodes();

            expect(publicNodes.fetchNodes).toHaveBeenCalledWith("all");
            expect(manager.addNode).toHaveBeenCalledTimes(3);
            expect(manager.addNode).toHaveBeenNthCalledWith(1, {
                name: "a",
                url: "a.example.com:2333",
                auth: "pass",
                secure: false,
                group: "public",
            });
            expect(kv.get).toHaveBeenCalledWith("lavalink:source-tags");
            expect(kv.set).toHaveBeenCalledWith("lavalink:node-health", expect.any(Object));
        });

        it("continues without public nodes when the fetch fails", async () => {
            const { nodeManager, manager, publicNodes, kv } = makeManager([]);
            publicNodes.fetchNodes.mockRejectedValue(new Error("network down"));

            await expect(nodeManager.syncNodes()).resolves.toBeUndefined();

            expect(manager.addNode).not.toHaveBeenCalled();
            expect(kv.get).toHaveBeenCalledWith("lavalink:source-tags");
        });
    });
});
