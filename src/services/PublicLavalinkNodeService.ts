import { z } from "zod";
import { Socket } from "net";
import logger from "../lib/winston.js";

export const ZodPublicLavalinkNode = z.object({
    "unique-id": z.string(),
    identifier: z.string(),
    host: z.string(),
    port: z.number(),
    password: z.string(),
    secure: z.boolean(),
    version: z.string(),
});

export type PublicLavalinkNode = z.infer<typeof ZodPublicLavalinkNode>;

const PUBLIC_NODES_API_SSL = "https://lavalink-list.ajieblogs.eu.org/SSL" as const;
const PUBLIC_NODES_API_NO_SSL = "https://lavalink-list.ajieblogs.eu.org/NonSSL" as const;
const PUBLIC_NODES_API_ALL = "https://lavalink-list.ajieblogs.eu.org/All" as const;

type PublicLavalinkNodeFetchType = "ssl" | "no-ssl" | "all";

export class PublicLavalinkNodeService {
    private static _instance: PublicLavalinkNodeService;
    private _cachedNodes: PublicLavalinkNode[] | null = null;
    private _lastFetchTime: number = 0;

    public static get instance(): PublicLavalinkNodeService {
        if (!this._instance) {
            this._instance = new PublicLavalinkNodeService();
        }
        return this._instance;
    }

    private constructor() {
        // Private constructor to prevent direct instantiation
    }

    public async fetchNodes(type: PublicLavalinkNodeFetchType = "all"): Promise<PublicLavalinkNode[]> {
        const now = Date.now();
        // Cache nodes for 10 minutes
        if (this._cachedNodes && now - this._lastFetchTime < 10 * 60 * 1000) {
            logger.debug("Public Lavalink nodes: cache hit", { count: this._cachedNodes.length });
            return this._cachedNodes;
        }

        let apiUrl: string;
        switch (type) {
            case "ssl":
                apiUrl = PUBLIC_NODES_API_SSL;
                break;
            case "no-ssl":
                apiUrl = PUBLIC_NODES_API_NO_SSL;
                break;
            case "all":
            default:
                apiUrl = PUBLIC_NODES_API_ALL;
                break;
        }

        const response = await (globalThis as any).fetch(apiUrl);
        if (!response.ok) {
            throw new Error(`Failed to fetch public Lavalink nodes: ${response.statusText}`);
        }
        const nodes: PublicLavalinkNode[] = await response.json();
        logger.info("Public Lavalink nodes fetched", { count: nodes.length, type });
        this._lastFetchTime = now;
        return nodes;
    }

    public async pingTest(node: PublicLavalinkNode): Promise<number> {
        const start = Date.now();
        const timeoutMs = 2000; // timeout for TCP and HTTP attempts

        // First try a raw TCP connect to host:port (like telnet) to check reachability.
        try {
            await new Promise<void>((resolve, reject) => {
                const socket = new Socket();
                let settled = false;

                const cleanUp = (err?: Error) => {
                    if (settled) return;
                    settled = true;
                    try {
                        socket.destroy();
                    } catch { /* ignore destroy errors */ }
                    if (err) reject(err);
                    else resolve();
                };

                const timer = setTimeout(() => {
                    cleanUp(new Error("TCP connect timeout"));
                }, timeoutMs);

                socket.once("connect", () => {
                    clearTimeout(timer);
                    cleanUp();
                });

                socket.once("error", (err) => {
                    clearTimeout(timer);
                    cleanUp(err instanceof Error ? err : new Error(String(err)));
                });

                // Start connection attempt
                socket.connect({ host: node.host, port: node.port });
            });

            const end = Date.now();
            return end - start;
        } catch (tcpErr) {
            // If TCP failed, attempt HTTP API endpoints.
            // Per Lavalink docs:
            // - Routes are prefixed with /v3 or /v4 for v3+ and v4 respectively (except /version).
            // - Most routes require the Authorization header with the node password.
            const getVersionPrefix = (ver: string): string | null => {
                const m = ver.match(/^v?(\d+)/i);
                if (!m) return null;
                const major = Number(m[1]);
                if (major === 3) return "v3";
                if (major === 4) return "v4";
                return null;
            };

            try {
                const prefix = getVersionPrefix(node.version);
                // Build attempt list: try `/vX/info` when we can determine prefix (with Authorization),
                // then try `/version` as a final fallback (no auth).
                const attempts: { path: string; useAuth: boolean }[] = [];
                if (prefix) {
                    attempts.push({ path: `/${prefix}/info`, useAuth: true });
                }
                // Always try /version as a fallback
                attempts.push({ path: `/version`, useAuth: false });

                for (const attempt of attempts) {
                    try {
                        const controller = new AbortController();
                        const timer = setTimeout(() => controller.abort(), timeoutMs);
                        const url = `${node.secure ? "https" : "http"}://${node.host}:${node.port}${attempt.path}`;
                        const headers: Record<string, string> = {};
                        if (attempt.useAuth) {
                            // Authorization uses the plain password as header value
                            headers["Authorization"] = node.password;
                        }

                        const response = await (globalThis as any).fetch(url, {
                            method: "GET",
                            signal: controller.signal,
                            headers,
                        });
                        clearTimeout(timer);

                        if (!response.ok) {
                            // Try next endpoint on non-OK status
                            continue;
                        }

                        // Successful HTTP response -> return latency
                        const end = Date.now();
                        return end - start;
                    } catch {
                        continue;
                    }
                }

                // all attempts failed, throw error instead
                throw new Error("HTTP info/version endpoints unreachable", { cause: tcpErr });
            } catch (httpErr) {
                const tcpMsg = tcpErr instanceof Error ? tcpErr.message : String(tcpErr);
                const httpMsg = httpErr instanceof Error ? httpErr.message : String(httpErr);
                throw new Error(`Ping test failed for node ${node.identifier}: TCP error: ${tcpMsg}; HTTP fallback error: ${httpMsg}`, { cause: httpErr });
            }
        }
    }

    public getNodes(): PublicLavalinkNode[] | null {
        return this._cachedNodes;
    }
}
