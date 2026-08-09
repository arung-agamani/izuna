import type { FastifyInstance, FastifyPluginOptions } from "fastify";

async function healthRoutes(fastify: FastifyInstance, _opts: FastifyPluginOptions) {
    fastify.get("/", async (_req, reply) => {
        return reply.send({ status: "ok", version: "0.0.1" });
    });
}

export default healthRoutes;
