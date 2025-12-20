import type { Shoukaku } from "shoukaku";

let shoukaku: Shoukaku | undefined;

/**
 * Service-layer context for the Shoukaku instance.
 *
 * This is intentionally separate from the legacy `src/lib/musicQueue.ts` so the new
 * services can be migrated gradually without depending on that module.
 */
export function setShoukakuContext(instance: Shoukaku) {
    shoukaku = instance;
}

export function getShoukakuContext() {
    return shoukaku;
}

export function requireShoukakuContext(): Shoukaku {
    if (!shoukaku) {
        throw new Error("Shoukaku context is not set. Call setShoukakuContext() during bot startup.");
    }
    return shoukaku;
}

/**
 * Resolve an active Lavalink node from Shoukaku.
 * Node selection is delegated to Shoukaku's configured nodeResolver.
 */
export function resolveLavalinkNode() {
    const manager = requireShoukakuContext();
    // @ts-ignore - shoukaku exposes nodeResolver dynamically
    const node = manager.options.nodeResolver(manager.nodes);
    if (!node) throw new Error("No Lavalink node connected");
    return node;
}
