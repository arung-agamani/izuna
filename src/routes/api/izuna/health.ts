import type { FastifyInstance, FastifyPluginOptions } from "fastify";

async function healthRoutes(fastify: FastifyInstance, _opts: FastifyPluginOptions) {
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
}

export default healthRoutes;
