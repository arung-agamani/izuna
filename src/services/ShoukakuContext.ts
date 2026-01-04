import type { Shoukaku } from "shoukaku";

let shoukaku: Shoukaku | undefined;

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

export function resolveLavalinkNode() {
    const manager = requireShoukakuContext();
    // @ts-ignore - shoukaku exposes nodeResolver dynamically
    const node = manager.options.nodeResolver(manager.nodes);
    if (!node) throw new Error("No Lavalink node connected");
    return node;
}
