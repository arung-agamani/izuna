import type { FastifyInstance, FastifyPluginOptions } from "fastify";

async function routes(fastify: FastifyInstance, _: FastifyPluginOptions) {
    fastify.get("/test", async (_req, _res) => {
        return {
            status: 200,
            message: "hello",
        };
    });
}

export default routes;
