import type { FastifyInstance, FastifyPluginOptions } from "fastify";
import type { HealthService } from "../../../services/HealthService.js";

interface HealthRoutesOptions extends FastifyPluginOptions {
    healthService: HealthService;
}

async function healthRoutes(fastify: FastifyInstance, opts: HealthRoutesOptions) {
    const { healthService } = opts;

    fastify.get("/", {
        schema: {
            description: "Health check endpoint.",
            tags: ["health"],
            response: {
                200: {
                    type: "object",
                    properties: {
                        status: { type: "string" },
                        version: { type: "string" },
                    },
                },
            },
        },
    }, async (_req, reply) => {
        return reply.send({ status: "ok", version: "0.0.1" });
    });

    fastify.get("/ready", {
        schema: {
            description: "Readiness check — reports DB, bot, and Lavalink status.",
            tags: ["health"],
        },
    }, async (_req, reply) => {
        const result = await healthService.check();
        return reply.status(result.status === "ok" ? 200 : 503).send(result);
    });
}

export default healthRoutes;
