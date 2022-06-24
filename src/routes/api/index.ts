import type { FastifyInstance, FastifyPluginOptions } from "fastify";
import tierlistRoutes from "./tierlist";

async function apiV1(instance: FastifyInstance, _: FastifyPluginOptions) {
    instance.register(tierlistRoutes, {
        prefix: "/tierlist",
    });
}

export default apiV1;
