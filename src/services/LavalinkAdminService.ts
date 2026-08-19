import type { Shoukaku } from "shoukaku";
import { z } from "zod";
import type { KeyValueRepository } from "../repositories/KeyValueRepository.js";
import { DEFAULT_SOURCE_TAGS, type LavalinkNodeManager } from "./LavalinkNodeManager.js";

const SOURCE_TAGS_KEY = "lavalink:source-tags";
const NODE_TAGS_KEY = "lavalink:node-tags";

const TagsMapSchema = z.record(z.string(), z.array(z.string()));

export const UpdatePreferencesSchema = z.object({
    sourceTags: TagsMapSchema.optional(),
    nodeTags: TagsMapSchema.optional(),
});

function stateLabel(state: number): string {
    switch (state) {
        case 0:
            return "connecting";
        case 1:
            return "connected";
        case 2:
            return "disconnecting";
        case 3:
            return "disconnected";
        default:
            return "unknown";
    }
}

export interface LavalinkNodeStatus {
    name: string;
    group: string | null;
    state: string;
    connected: boolean;
    penalties: number;
    tags: string[];
    lastError: string | null;
}

export interface LavalinkPreferences {
    sourceTags: Record<string, string[]>;
    nodeTags: Record<string, string[]>;
}

/**
 * Read/control surface for the admin panel over the Lavalink node pool and its
 * source→tag / node→tags preferences. Reads and writes the KV store (source of
 * truth) and, on mutation, reloads the in-memory node manager.
 */
export class LavalinkAdminService {
    constructor(
        private readonly kv: KeyValueRepository,
        private readonly getManager: () => Shoukaku | undefined,
        private readonly getNodeManager: () => LavalinkNodeManager | undefined,
    ) {}

    getNodes(): LavalinkNodeStatus[] {
        const manager = this.getManager();
        const nodeManager = this.getNodeManager();
        if (!manager) return [];
        return [...manager.nodes.values()].map((node) => ({
            name: node.name,
            group: node.group ?? null,
            state: stateLabel(node.state),
            connected: node.state === 1 /* State.CONNECTED */,
            penalties: node.penalties,
            tags: nodeManager ? nodeManager.effectiveTags(node) : [],
            lastError: nodeManager ? nodeManager.getLastError(node.name) : null,
        }));
    }

    async getPreferences(): Promise<LavalinkPreferences> {
        const sourceTags = TagsMapSchema.safeParse(await this.kv.get(SOURCE_TAGS_KEY));
        const nodeTags = TagsMapSchema.safeParse(await this.kv.get(NODE_TAGS_KEY));
        return {
            sourceTags: sourceTags.success ? sourceTags.data : { ...DEFAULT_SOURCE_TAGS },
            nodeTags: nodeTags.success ? nodeTags.data : {},
        };
    }

    async updatePreferences(input: Partial<LavalinkPreferences>): Promise<LavalinkPreferences> {
        const current = await this.getPreferences();
        const sourceTags = input.sourceTags ?? current.sourceTags;
        const nodeTags = input.nodeTags ?? current.nodeTags;
        await this.kv.set(SOURCE_TAGS_KEY, sourceTags);
        await this.kv.set(NODE_TAGS_KEY, nodeTags);
        await this.getNodeManager()?.loadPreferences();
        return { sourceTags, nodeTags };
    }

    async syncNodes(): Promise<void> {
        await this.getNodeManager()?.syncNodes();
    }
}
