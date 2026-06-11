import type { Shoukaku } from "shoukaku";
import logger from "../lib/winston"

let shoukaku: Shoukaku | undefined;

export function setShoukakuContext(instance: Shoukaku) {
    shoukaku = instance;
    logger.debug("Shoukaku context has been set");
}

export function getShoukakuContext() {
    return shoukaku;
}

export function requireShoukakuContext(): Shoukaku {
    logger.debug("Attempting to retrieve Shoukaku context");
    if (!shoukaku) {
        throw new Error("Shoukaku context is not set. Call setShoukakuContext() during bot startup.");
    }
    return shoukaku;
}

export function resolveLavalinkNode() {
    const manager = requireShoukakuContext();
    const node = manager.options.nodeResolver(manager.nodes);
    if (!node) throw new Error("No Lavalink node connected");
    return node;
}
