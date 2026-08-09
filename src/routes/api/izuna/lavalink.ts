import type { FastifyInstance, FastifyPluginOptions } from "fastify";
import { z } from "zod";
import { PublicLavalinkNodeService, ZodPublicLavalinkNode } from "../../../services/PublicLavalinkNodeService";

const PublicLavalinkNodeListResponse = z.object({
    success: z.boolean(),
    data: z.array(ZodPublicLavalinkNode),
    errors: z.array(z.string()).optional(),
});

async function lavalinkRoutes(fastify: FastifyInstance, _opts: FastifyPluginOptions) {
    const service = PublicLavalinkNodeService.instance;

    fastify.get("/nodes", {
        schema: {
            description: "Get public Lavalink nodes. Supports filtering by connection type and Lavalink major version.",
            tags: ["lavalink"],
            querystring: {
                type: "object",
                properties: {
                    type: { type: "string", enum: ["ssl", "no-ssl", "all"], description: "Filter nodes by SSL support. Defaults to 'all'." },
                    version: {
                        type: "string",
                        enum: ["v3", "v4", "all"],
                        description: "Filter nodes by Lavalink major version (v3 or v4). Defaults to 'all'.",
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
            return reply.status(200).send({ success: true, data: nodes });
        } catch (error) {
            return reply.status(500).send({ success: false, data: [], errors: [error instanceof Error ? error.message : String(error)] });
        }
    });

    fastify.get("/nodes/connectivity", async (_request, reply) => {
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
            return reply.status(200).send({ success: true, data: results });
        } catch (error) {
            return reply.status(500).send({ success: false, data: [], errors: [error instanceof Error ? error.message : String(error)] });
        }
    });
}

export default lavalinkRoutes;
