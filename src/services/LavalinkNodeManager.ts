import { z } from "zod";
import type { Shoukaku, Node } from "shoukaku";
import type { KeyValueRepository } from "../repositories/KeyValueRepository.js";
import type { PublicLavalinkNodeService, PublicLavalinkNode } from "./PublicLavalinkNodeService.js";
import type { NodeSource } from "../lib/lavalink/source.js";
import { toNodeOption } from "../lib/lavalink/nodeConverters.js";
import logger from "../lib/winston.js";

const SOURCE_TAGS_KEY = "lavalink:source-tags";
const NODE_TAGS_KEY = "lavalink:node-tags";
const NODE_HEALTH_KEY = "lavalink:node-health";

// Shoukaku exposes its State enum only under `Constants.State`, not as a top-level
// export. CONNECTED = 1 (see refresh-shoukaku.ts:152 for the existing convention).
const CONNECTED = 1;

// Max concurrent reachability checks during node evaluation.
const PING_CONCURRENCY = 5;

export const DEFAULT_SOURCE_TAGS: Record<string, string[]> = {
    youtube: ["public"],
    http: ["local", "public"],
    default: ["public"],
};

type NodeHealthEntry = {
    healthy: boolean;
    latencyMs: number | null;
    lastCheckedAt: string;
};

type NodeHealthMap = Record<string, NodeHealthEntry>;

interface PingResult {
    node: PublicLavalinkNode;
    healthy: boolean;
    latencyMs: number | null;
}

const NodeHealthEntrySchema = z.object({
    healthy: z.boolean(),
    latencyMs: z.number().nullable(),
    lastCheckedAt: z.string(),
});

const NodeHealthMapSchema = z.record(z.string(), NodeHealthEntrySchema);

/** Stable identifier for a public node — matches `toNodeOption`'s `name`. */
function nodeKey(node: PublicLavalinkNode): string {
    return node["unique-id"] ?? node.identifier;
}

async function mapWithConcurrency<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
    const results: R[] = new Array(items.length);
    let next = 0;
    const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
        while (next < items.length) {
            const index = next++;
            results[index] = await fn(items[index]);
        }
    });
    await Promise.all(workers);
    return results;
}

/**
 * Owns the bot node pool's metadata and node selection.
 * - Tags nodes (`local`/`public` auto-derived from `Node.group`, overridable via KV).
 * - Resolves nodes source-aware for REST resolution (YouTube vs HTTP).
 * - Provides a group-preference resolver for Shoukaku's internal playback placement.
 * - Fetches, health-checks, ranks and adds the public node pool (optional, bounded, add-only).
 */
export class LavalinkNodeManager {
    private sourceTags: Record<string, string[]> = { ...DEFAULT_SOURCE_TAGS };
    private nodeTags: Record<string, string[]> = {};
    private lastErrors: Map<string, string> = new Map();

    constructor(
        private readonly kv: KeyValueRepository,
        private readonly publicNodes: PublicLavalinkNodeService,
        private readonly getManager: () => Shoukaku | undefined,
        private readonly maxPublicNodes: number = 3,
    ) {}

    async loadPreferences(): Promise<void> {
        try {
            const sourceTags = await this.kv.get(SOURCE_TAGS_KEY);
            if (sourceTags && typeof sourceTags === "object") {
                this.sourceTags = sourceTags as Record<string, string[]>;
            }
            const nodeTags = await this.kv.get(NODE_TAGS_KEY);
            if (nodeTags && typeof nodeTags === "object") {
                this.nodeTags = nodeTags as Record<string, string[]>;
            }
        } catch (error) {
            logger.warn("Failed to load Lavalink node preferences, using defaults", {
                error: error instanceof Error ? error.message : String(error),
            });
        }
    }

    /** KV override replaces the auto tag; otherwise `public` group → ["public"], else ["local"]. */
    effectiveTags(node: Node): string[] {
        return this.nodeTags[node.name] ?? (node.group === "public" ? ["public"] : ["local"]);
    }

    /** Record the last connection error for a node — surfaced by the admin panel. */
    recordError(name: string, error: unknown): void {
        this.lastErrors.set(name, error instanceof Error ? error.message : String(error));
    }

    getLastError(name: string): string | null {
        return this.lastErrors.get(name) ?? null;
    }

    resolveNode(source: NodeSource): Node | undefined {
        const manager = this.getManager();
        if (!manager) return undefined;
        const nodes = [...manager.nodes.values()].filter((n) => n.state === CONNECTED);
        if (nodes.length === 0) return undefined;

        const preferred = this.sourceTags[source] ?? this.sourceTags.default ?? [];
        for (const tag of preferred) {
            const matched = nodes.filter((n) => this.effectiveTags(n).includes(tag));
            if (matched.length > 0) {
                return matched.sort((a, b) => a.penalties - b.penalties)[0];
            }
        }
        return nodes.sort((a, b) => a.penalties - b.penalties)[0];
    }

    /**
     * Group-preference resolver for Shoukaku's `getIdealNode` (playback placement).
     * NOT source-aware — Shoukaku's resolver signature carries no source. Prefers
     * self-hosted nodes over the public pool, then lowest penalties.
     */
    nodeResolver(): (nodes: Map<string, Node>) => Node | undefined {
        return (nodes) => {
            const connected = [...nodes.values()].filter((n) => n.state === CONNECTED);
            if (connected.length === 0) return undefined;
            const local = connected.filter((n) => n.group !== "public");
            return (local.length > 0 ? local : connected).sort((a, b) => a.penalties - b.penalties)[0];
        };
    }

    /**
     * Health-check and rank public nodes, selecting the best `maxPublicNodes`.
     * - Cold start (no saved health): evaluates every node.
     * - Warm start: re-checks only previously-healthy nodes; if they all died, falls back to a full evaluation.
     * Persists the updated health map to KV for the next boot.
     */
    async selectHealthyNodes(nodes: PublicLavalinkNode[]): Promise<PublicLavalinkNode[]> {
        const previous = await this.loadHealth();
        const warmCandidates = Object.keys(previous).length > 0
            ? nodes.filter((node) => previous[nodeKey(node)]?.healthy === true)
            : [];

        if (warmCandidates.length > 0) {
            const warmResults = await this.pingNodes(warmCandidates);
            const stillHealthy = warmResults.filter((result) => result.healthy);
            if (stillHealthy.length > 0) {
                await this.kv.set(NODE_HEALTH_KEY, this.mergeHealth(previous, warmResults));
                return stillHealthy
                    .sort((a, b) => (a.latencyMs ?? Infinity) - (b.latencyMs ?? Infinity))
                    .slice(0, this.maxPublicNodes)
                    .map((result) => result.node);
            }
            // Every previously-healthy node is now dead — fall through to full re-evaluation.
        }

        const allResults = await this.pingNodes(nodes);
        await this.kv.set(NODE_HEALTH_KEY, this.mergeHealth(previous, allResults));
        return allResults
            .filter((result) => result.healthy)
            .sort((a, b) => (a.latencyMs ?? Infinity) - (b.latencyMs ?? Infinity))
            .slice(0, this.maxPublicNodes)
            .map((result) => result.node);
    }

    async syncNodes(): Promise<void> {
        const manager = this.getManager();
        if (!manager) return;
        try {
            const nodes = await this.publicNodes.fetchNodes("all");
            const selected = await this.selectHealthyNodes(nodes);
            for (const node of selected) {
                manager.addNode(toNodeOption(node));
                logger.debug("Added public Lavalink node to pool", { name: nodeKey(node) });
            }
            logger.info("Public Lavalink node selection complete", { fetched: nodes.length, selected: selected.length });
        } catch (error) {
            logger.warn("Failed to sync public Lavalink nodes; continuing with configured nodes only", {
                error: error instanceof Error ? error.message : String(error),
            });
        }
        await this.loadPreferences();
    }

    private async loadHealth(): Promise<NodeHealthMap> {
        const parsed = NodeHealthMapSchema.safeParse(await this.kv.get(NODE_HEALTH_KEY));
        return parsed.success ? parsed.data : {};
    }

    private mergeHealth(previous: NodeHealthMap, results: PingResult[]): NodeHealthMap {
        const next = { ...previous };
        const checkedAt = new Date().toISOString();
        for (const { node, healthy, latencyMs } of results) {
            next[nodeKey(node)] = { healthy, latencyMs, lastCheckedAt: checkedAt };
        }
        return next;
    }

    private async pingNodes(nodes: PublicLavalinkNode[]): Promise<PingResult[]> {
        const userId = this.getManager()?.id ?? "izuna-health-check";
        return mapWithConcurrency(nodes, PING_CONCURRENCY, async (node) => {
            try {
                const latencyMs = await this.publicNodes.websocketProbe(node, userId);
                return { node, healthy: true, latencyMs };
            } catch (error) {
                this.recordError(nodeKey(node), error);
                return { node, healthy: false, latencyMs: null };
            }
        });
    }
}
