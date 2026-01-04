import { FastifyInstance, FastifyPluginOptions } from "fastify";
import { z } from "zod";
import { PublicLavalinkNodeService, ZodPublicLavalinkNode } from "../../../services/PublicLavalinkNodeService";

const PublicLavalinkNodeListResponse = z.object({
    success: z.boolean(),
    data: z.array(ZodPublicLavalinkNode),
    errors: z.array(z.string()).optional(),
});

async function izunaRoutes(fastify: FastifyInstance, _: FastifyPluginOptions) {
    const publicLavalinkNodeService = PublicLavalinkNodeService.instance;

    fastify.get(
        "/lavalink/nodes",
        {
            schema: {
                description: "Get public Lavalink nodes. Supports filtering by connection type and Lavalink major version.",
                tags: ["lavalink"],
                querystring: {
                    type: "object",
                    properties: {
                        type: {
                            type: "string",
                            enum: ["ssl", "no-ssl", "all"],
                            description: "Filter nodes by SSL support. Defaults to 'all'.",
                        },
                        version: {
                            type: "string",
                            enum: ["v3", "v4", "all"],
                            description: "Filter nodes by Lavalink major version (v3 or v4). Defaults to 'all'.",
                        },
                    },
                },
                response: {
                    200: {
                        type: "object",
                        properties: {
                            success: { type: "boolean" },
                            data: {
                                type: "array",
                                items: {
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
                                    required: ["unique-id", "identifier", "host", "port", "password", "secure", "version"],
                                },
                            },
                            errors: {
                                type: "array",
                                items: { type: "string" },
                            },
                        },
                    },
                    500: {
                        type: "object",
                        properties: {
                            success: { type: "boolean" },
                            data: { type: "array", items: { type: "object" } },
                            errors: { type: "array", items: { type: "string" } },
                        },
                    },
                },
            },
        },
        async (request, reply) => {
            // Support query params:
            // - type: "ssl" | "no-ssl" | "all" (existing)
            // - version: "v3" | "v4" | "all" (new)
            const QuerySchema = z.object({
                type: z.enum(["ssl", "no-ssl", "all"]).optional(),
                version: z.enum(["v3", "v4", "all"]).optional(),
            });

            const parsed = QuerySchema.safeParse(request.query as Record<string, unknown>);
            const type = parsed.success
                ? (parsed.data.type ?? "all")
                : (((request.query as { type?: string }).type as "ssl" | "no-ssl" | "all" | undefined) ?? "all");
            const version = parsed.success
                ? (parsed.data.version ?? "all")
                : (((request.query as { version?: string }).version as "v3" | "v4" | "all" | undefined) ?? "all");

            try {
                let nodes = await publicLavalinkNodeService.fetchNodes(type);

                // Apply version filtering if requested
                if (version !== "all") {
                    nodes = nodes.filter((node) => {
                        const ver = (node.version ?? "").toLowerCase();
                        // Accept formats like "v3", "3.4.0", "v4.0.0" etc.
                        if (version === "v3") {
                            return ver.startsWith("v3") || ver.startsWith("3");
                        }
                        if (version === "v4") {
                            return ver.startsWith("v4") || ver.startsWith("4");
                        }
                        return true;
                    });
                }

                const res = PublicLavalinkNodeListResponse.parse({
                    success: true,
                    data: nodes,
                });
                return reply.status(200).send(res);
            } catch (error) {
                const res = PublicLavalinkNodeListResponse.parse({
                    success: false,
                    data: [],
                    errors: [error instanceof Error ? error.message : String(error)],
                });
                return reply.status(500).send(res);
            }
        },
    );

    fastify.get("/lavalink/nodes/connectivity", async (request, reply) => {
        try {
            const nodes = await publicLavalinkNodeService.fetchNodes("all");
            const results = await Promise.all(
                nodes.map(async (node) => {
                    try {
                        const latency = await publicLavalinkNodeService.pingTest(node);
                        return {
                            identifier: node.identifier,
                            host: node.host,
                            port: node.port,
                            secure: node.secure,
                            version: node.version,
                            latency,
                            success: true,
                        };
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
            return reply.status(200).send({
                success: true,
                data: results,
            });
        } catch (error) {
            return reply.status(500).send({
                success: false,
                data: [],
                errors: [error instanceof Error ? error.message : String(error)],
            });
        }
    });

    fastify.get("/", async (request, reply) => {
        return reply.send({ message: "Izuna API is running." });
    });
}

export default izunaRoutes;
