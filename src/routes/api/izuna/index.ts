import type { FastifyInstance, FastifyPluginOptions } from "fastify";
import healthRoutes from "./health";
import authRoutes from "./auth";
import userRoutes from "./users";
import guildRoutes from "./guilds";
import adminRoutes from "./admin";
import lavalinkRoutes from "./lavalink";

async function izunaRoutes(fastify: FastifyInstance, _opts: FastifyPluginOptions) {
    await fastify.register(healthRoutes, { prefix: "/health" });
    await fastify.register(authRoutes, { prefix: "/auth" });
    await fastify.register(userRoutes, { prefix: "/users" });
    await fastify.register(guildRoutes, { prefix: "/guilds" });
    await fastify.register(adminRoutes, { prefix: "/admin" });
    await fastify.register(lavalinkRoutes, { prefix: "/lavalink" });
}

export default izunaRoutes;
