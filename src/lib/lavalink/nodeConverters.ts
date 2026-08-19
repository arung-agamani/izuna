import type { NodeOption } from "shoukaku";
import type { PublicLavalinkNode } from "../../services/PublicLavalinkNodeService.js";

/**
 * Convert a public Lavalink node (from the public list API) into a Shoukaku
 * `NodeOption`. Shape mirrors docs/lavalink-node-management.md §3.5.
 *
 * `url` intentionally has no scheme — Shoukaku builds `ws(s)://<url>/v4/websocket`
 * using the `secure` flag.
 */
export function toNodeOption(node: PublicLavalinkNode): NodeOption {
    return {
        name: node["unique-id"] ?? node.identifier,
        url: `${node.host}:${node.port}`,
        auth: node.password,
        secure: node.secure,
        group: "public",
    };
}
