import type { FastifyInstance, FastifyPluginOptions } from "fastify";
import healthRoutes from "./health.js";
import authRoutes from "./auth.js";
import userRoutes from "./users.js";
import guildRoutes from "./guilds.js";
import adminRoutes from "./admin.js";
import lavalinkRoutes from "./lavalink.js";

async function izunaRoutes(fastify: FastifyInstance, _opts: FastifyPluginOptions) {
    await fastify.register(healthRoutes, { prefix: "/health" });
    await fastify.register(authRoutes, { prefix: "/auth" });
    await fastify.register(userRoutes, { prefix: "/users" });
    await fastify.register(guildRoutes, { prefix: "/guilds" });
    await fastify.register(adminRoutes, { prefix: "/admin" });
    await fastify.register(lavalinkRoutes, { prefix: "/lavalink" });
}

export default izunaRoutes;
