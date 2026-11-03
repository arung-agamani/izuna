import type { Shoukaku, Node } from "shoukaku";
import type { LavalinkNodeManager } from "./LavalinkNodeManager.js";
import type { NodeSource } from "../lib/lavalink/source.js";
import logger from "../lib/winston.js";

let manager: Shoukaku | undefined;
let nodeManager: LavalinkNodeManager | undefined;

export function setLavalinkManager(instance: Shoukaku): void {
    manager = instance;
    logger.debug("Lavalink manager has been set");
}

export function getLavalinkManager(): Shoukaku | undefined {
    return manager;
}

export function requireLavalinkManager(): Shoukaku {
    logger.debug("Attempting to retrieve Lavalink manager");
    if (!manager) {
        throw new Error("Lavalink manager is not set. Call setLavalinkManager() during bot startup.");
    }
    return manager;
}

export function setLavalinkNodeManager(instance: LavalinkNodeManager): void {
    nodeManager = instance;
}

export function getLavalinkNodeManager(): LavalinkNodeManager | undefined {
    return nodeManager;
}

/**
 * Resolve a source-aware node for REST track resolution.
 * Delegates to the LavalinkNodeManager (wired at startup); throws when no
 * connected node satisfies the source preference or no manager is set.
 */
export function resolveNode(source: NodeSource): Node {
    const node = nodeManager?.resolveNode(source);
    if (!node) throw new Error("No Lavalink node connected");
    return node;
}

/**
 * Resolve a node with self-healing fallback. If no node is currently connected,
 * triggers an emergency sync (which fetches + health-checks the public pool) and
 * retries resolution. The emergency sync is guarded by a cooldown and a sync lock,
 * so concurrent callers won't spam the public API.
 *
 * @param source  - The source category for tag-aware routing.
 * @param timeoutMs - Max time to wait for an emergency sync (default 30s).
 * @throws Error if no node can be found after the emergency sync completes.
 */
export async function resolveNodeWithRecovery(source: NodeSource, timeoutMs = 30_000): Promise<Node> {
    const existing = nodeManager?.resolveNode(source);
    if (existing) return existing;

    logger.warn("No connected Lavalink nodes — triggering emergency sync", { source });
    await nodeManager?.emergencySync(timeoutMs);

    const after = nodeManager?.resolveNode(source);
    if (!after) throw new Error("No Lavalink node connected — emergency sync did not find any healthy node");
    return after;
}
