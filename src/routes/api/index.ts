import type { FastifyInstance, FastifyPluginOptions } from "fastify";
import tierlistRoutes from "./tierlist";
import closureRoutes from "./closure";

async function apiV1(instance: FastifyInstance, _: FastifyPluginOptions) {
    instance.register(tierlistRoutes, {
        prefix: "/tierlist",
    });
    instance.register(closureRoutes, {
        prefix: "/closure",
    });

    instance.get("/status", async (_req, _res) => {
        return {
            status: "200",
            version: "0.0.1",
            message: "You've just been awoo'd!",
        };
    });
}

export default apiV1;
