import type { FastifyInstance, FastifyPluginOptions } from "fastify";
import tierlistRoutes from "./tierlist";
import closureRoutes from "./closure";
import reminderRoutes from "./reminders";
import oauthRoutes from "../oauth";
import izunaRoutes from "./izuna";

async function apiV1(instance: FastifyInstance, _: FastifyPluginOptions) {
    instance.register(tierlistRoutes, {
        prefix: "/tierlist",
    });
    instance.register(closureRoutes, {
        prefix: "/closure",
    });
    instance.register(reminderRoutes, {
        prefix: "/reminders",
    });
    instance.register(izunaRoutes, {
        prefix: "/izuna",
    });
    instance.register(oauthRoutes);

    instance.get("/status", async (_req, _res) => {
        return {
            status: "200",
            version: "0.0.1",
            message: "You've just been awoo'd!",
        };
    });
}

export default apiV1;
