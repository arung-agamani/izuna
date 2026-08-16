import type { FastifyInstance, FastifyPluginOptions } from "fastify";
import { z } from "zod";
import { PublicLavalinkNodeService } from "../../../services/PublicLavalinkNodeService.js";

const NodeSchema = {
    type: "object",
    properties: {
        "unique-id": { type: "string" },
        identifier: { type: "string" },
        host: { type: "string" },
        port: { type: "number" },
        password: { type: "string" },
        secure: { type: "boolean" },
        version: { type: "string" },
    },
};

async function lavalinkRoutes(fastify: FastifyInstance, _opts: FastifyPluginOptions) {
    const service = PublicLavalinkNodeService.instance;

    fastify.get("/nodes", {
        schema: {
            description: "Get public Lavalink nodes. Supports filtering by connection type and Lavalink major version.",
            tags: ["lavalink"],
            querystring: {
                type: "object",
                properties: {
                    type: { type: "string", enum: ["ssl", "no-ssl", "all"] },
                    version: { type: "string", enum: ["v3", "v4", "all"] },
                },
            },
            response: {
                200: {
                    type: "object",
                    properties: {
                        data: { type: "array", items: NodeSchema },
                    },
                },
            },
        },
    }, async (request, reply) => {
        const QuerySchema = z.object({
            type: z.enum(["ssl", "no-ssl", "all"]).optional(),
            version: z.enum(["v3", "v4", "all"]).optional(),
        });
        const parsed = QuerySchema.safeParse(request.query);
        const type = parsed.success ? (parsed.data.type ?? "all") : "all";
        const version = parsed.success ? (parsed.data.version ?? "all") : "all";

        try {
            let nodes = await service.fetchNodes(type as "ssl" | "no-ssl" | "all");
            if (version !== "all") {
                nodes = nodes.filter((n) => {
                    const ver = (n.version ?? "").toLowerCase();
                    return version === "v3" ? ver.startsWith("v3") || ver.startsWith("3") : ver.startsWith("v4") || ver.startsWith("4");
                });
            }
            return reply.send({ data: nodes });
        } catch (error) {
            return reply.status(500).send({ error: error instanceof Error ? error.message : String(error) });
        }
    });

    fastify.get("/nodes/connectivity", {
        schema: {
            description: "Ping-test all public Lavalink nodes, return latency per node.",
            tags: ["lavalink"],
            response: {
                200: {
                    type: "object",
                    properties: {
                        data: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    identifier: { type: "string" },
                                    host: { type: "string" },
                                    port: { type: "number" },
                                    secure: { type: "boolean" },
                                    version: { type: "string" },
                                    latency: { type: "number", nullable: true },
                                    success: { type: "boolean" },
                                    error: { type: "string" },
                                },
                            },
                        },
                    },
                },
            },
        },
    }, async (_request, reply) => {
        try {
            const nodes = await service.fetchNodes("all");
            const results = await Promise.all(
                nodes.map(async (node) => {
                    try {
                        const latency = await service.pingTest(node);
                        return { identifier: node.identifier, host: node.host, port: node.port, secure: node.secure, version: node.version, latency, success: true };
                    } catch (error) {
                        return {
                            identifier: node.identifier,
                            host: node.host,
                            port: node.port,
                            secure: node.secure,
                            version: node.version,
                            latency: null,
                            success: false,
                            error: error instanceof Error ? error.message : String(error),
                        };
                    }
                }),
            );
            return reply.send({ data: results });
        } catch (error) {
            return reply.status(500).send({ error: error instanceof Error ? error.message : String(error) });
        }
    });
}

export default lavalinkRoutes;
