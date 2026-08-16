import type { Shoukaku } from "shoukaku";
import logger from "../lib/winston.js";

let manager: Shoukaku | undefined;

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

export function resolveNode() {
    const manager = requireLavalinkManager();
    const node = manager.options.nodeResolver(manager.nodes);
    if (!node) throw new Error("No Lavalink node connected");
    return node;
}
