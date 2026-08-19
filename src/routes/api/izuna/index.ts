import type { FastifyInstance, FastifyPluginOptions } from "fastify";
import healthRoutes from "./health.js";
import authRoutes from "./auth.js";
import userRoutes from "./users.js";
import guildRoutes from "./guilds.js";
import adminRoutes from "./admin.js";
import lavalinkRoutes from "./lavalink.js";
import adminLavalinkRoutes from "./adminLavalink.js";
import { HealthService } from "../../../services/HealthService.js";
import { getBotClient } from "../../../lib/botClient.js";
import { getLavalinkManager, getLavalinkNodeManager } from "../../../services/LavalinkService.js";
import prisma from "../../../lib/prisma.js";
import { config } from "../../../config/index.js";
import { LavalinkAdminService } from "../../../services/LavalinkAdminService.js";
import { KeyValueRepository } from "../../../repositories/KeyValueRepository.js";

async function izunaRoutes(fastify: FastifyInstance, _opts: FastifyPluginOptions) {
    await fastify.register(healthRoutes, {
        prefix: "/health",
        healthService: new HealthService(prisma, getBotClient, getLavalinkManager, config.runBot),
    });
    await fastify.register(authRoutes, { prefix: "/auth" });
    await fastify.register(userRoutes, { prefix: "/users" });
    await fastify.register(guildRoutes, { prefix: "/guilds" });
    await fastify.register(adminRoutes, { prefix: "/admin" });
    await fastify.register(lavalinkRoutes, { prefix: "/lavalink" });
    await fastify.register(adminLavalinkRoutes, {
        prefix: "/admin/lavalink",
        lavalinkAdminService: new LavalinkAdminService(
            new KeyValueRepository(prisma),
            getLavalinkManager,
            getLavalinkNodeManager,
        ),
    });
}

export default izunaRoutes;
