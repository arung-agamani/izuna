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
