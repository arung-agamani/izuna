import { z } from "zod";
import type { Shoukaku, Node } from "shoukaku";
import type { KeyValueRepository } from "../repositories/KeyValueRepository.js";
import type { PublicLavalinkNodeService, PublicLavalinkNode } from "./PublicLavalinkNodeService.js";
import type { NodeSource } from "../lib/lavalink/source.js";
import { toNodeOption } from "../lib/lavalink/nodeConverters.js";
import logger from "../lib/winston.js";

const SOURCE_TAGS_KEY = "lavalink:source-tags";
const NODE_TAGS_KEY = "lavalink:node-tags";
export const NODE_HEALTH_KEY = "lavalink:node-health";

/** Default interval for periodic node pool refresh: 10 minutes. */
const DEFAULT_SYNC_INTERVAL_MS = 600_000;
/** Minimum gap between syncs — prevents spamming the public API. */
const DEFAULT_SYNC_COOLDOWN_MS = 30_000;

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

export type NodeHealthEntry = {
    healthy: boolean;
    latencyMs: number | null;
    lastCheckedAt: string;
};

export type NodeHealthMap = Record<string, NodeHealthEntry>;

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

export const NodeHealthMapSchema = z.record(z.string(), NodeHealthEntrySchema);

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

    // --- Self-healing state ---
    private syncLock = false;
    private lastSyncAt = 0;
    private periodicSyncTimer: ReturnType<typeof setInterval> | null = null;

    constructor(
        private readonly kv: KeyValueRepository,
        private readonly publicNodes: PublicLavalinkNodeService,
        private readonly getManager: () => Shoukaku | undefined,
        private readonly maxPublicNodes: number = 3,
        private readonly syncCooldownMs: number = DEFAULT_SYNC_COOLDOWN_MS,
        private readonly syncIntervalMs: number = DEFAULT_SYNC_INTERVAL_MS,
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
            const addedNames: string[] = [];
            const skippedNames: string[] = [];
            for (const node of selected) {
                const option = toNodeOption(node);
                if (manager.nodes.has(option.name)) {
                    skippedNames.push(option.name);
                    continue; // add-only — never replace a live node
                }
                manager.addNode(option);
                addedNames.push(option.name);
            }
            logger.info("Public Lavalink node selection complete", {
                fetched: nodes.length,
                selected: selected.length,
                selectedNames: selected.map(nodeKey),
                added: addedNames.length,
                addedNames,
                skipped: skippedNames.length,
                skippedNames,
            });
        } catch (error) {
            logger.warn("Failed to sync public Lavalink nodes; continuing with configured nodes only", {
                error: error instanceof Error ? error.message : String(error),
            });
        }
        await this.loadPreferences();
    }

    // ---------------------------------------------------------------------------
    // Self-healing: periodic refresh, emergency sync, connected-node tracking
    // ---------------------------------------------------------------------------

    /**
     * Start a periodic timer that refreshes the public node pool on a fixed
     * interval. Idempotent — calling this when a timer is already running is a
     * no-op. The timer keeps the process alive; call {@link stopPeriodicSync}
     * on graceful shutdown.
     */
    startPeriodicSync(intervalMs: number = this.syncIntervalMs): void {
        if (this.periodicSyncTimer) return;
        this.periodicSyncTimer = setInterval(() => {
            this.syncNodes().catch((err) => {
                logger.warn("Periodic Lavalink node sync failed", {
                    error: err instanceof Error ? err.message : String(err),
                });
            });
        }, intervalMs);
        // Don't let the timer alone keep the process alive during graceful shutdown.
        if (typeof this.periodicSyncTimer.unref === "function") {
            this.periodicSyncTimer.unref();
        }
        logger.info("Started periodic Lavalink node sync", { intervalMs });
    }

    /** Stop the periodic sync timer started by {@link startPeriodicSync}. */
    stopPeriodicSync(): void {
        if (this.periodicSyncTimer) {
            clearInterval(this.periodicSyncTimer);
            this.periodicSyncTimer = null;
            logger.info("Stopped periodic Lavalink node sync");
        }
    }

    /**
     * Trigger a guarded, on-demand node sync. Safe to call from multiple
     * callers concurrently — only one sync runs at a time and a cooldown
     * prevents rapid re-entry after a recent sync.
     *
     * @param timeoutMs Max time to wait if another sync is already in progress.
     *                  Defaults to 30s. If the wait times out, the method
     *                  returns without syncing (the caller falls back to a no-node error).
     */
    async emergencySync(timeoutMs: number = 30_000): Promise<void> {
        if (this.syncLock) {
            await this.waitForSync(timeoutMs);
            return;
        }

        if (Date.now() - this.lastSyncAt < this.syncCooldownMs) {
            logger.debug("Emergency sync skipped — cooldown active", {
                msSinceLastSync: Date.now() - this.lastSyncAt,
            });
            return;
        }

        this.syncLock = true;
        try {
            logger.info("Starting emergency Lavalink node sync");
            await this.syncNodes();
            this.lastSyncAt = Date.now();
        } catch (error) {
            logger.warn("Emergency Lavalink node sync failed", {
                error: error instanceof Error ? error.message : String(error),
            });
        } finally {
            this.syncLock = false;
        }
    }

    /** Number of nodes currently in CONNECTED state. */
    getConnectedNodeCount(): number {
        const manager = this.getManager();
        if (!manager) return 0;
        return [...manager.nodes.values()].filter((n) => n.state === CONNECTED).length;
    }

    /** Convenience predicate — true when at least one node is CONNECTED. */
    hasConnectedNodes(): boolean {
        return this.getConnectedNodeCount() > 0;
    }

    // ---------------------------------------------------------------------------

    /**
     * Wait for an in-flight sync to complete. Polls the sync lock every 500ms.
     * Resolves when the sync completes or the timeout elapses (whichever first).
     */
    private async waitForSync(timeoutMs: number): Promise<void> {
        const start = Date.now();
        while (this.syncLock && Date.now() - start < timeoutMs) {
            await new Promise<void>((resolve) => setTimeout(resolve, 500));
        }
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
        // Probe with a placeholder User-Id, NOT the bot's real id. Connecting to a
        // node with the same User-Id as an active player session can make the node
        // replace the player's session, disrupting playback when the probe closes.
        const userId = "izuna-health-check";
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
