import fp from "fastify-plugin";
import { FastifyRequest, FastifyReply } from "fastify";
import { config } from "../../config";
import logger from "../../lib/winston";

export default fp(async (fastify) => {
    // Pre-handler: require whitelisted admin user
    fastify.decorate("adminRequired", async function (request: FastifyRequest, reply: FastifyReply) {
        try {
            await request.jwtVerify();
        } catch {
            logger.warn("Admin auth failed — JWT verification failed", { url: request.url.split("?")[0] });
            return reply.status(401).send({ error: "Unauthorized" });
        }

        const uid = request.user.uid;
        if (!config.adminUsers.includes(uid)) {
            logger.warn("Admin auth failed — user not in whitelist", { uid, url: request.url.split("?")[0] });
            return reply.status(403).send({ error: "Forbidden" });
        }
    });
});

declare module "fastify" {
    interface FastifyInstance {
        adminRequired: (req: FastifyRequest, res: FastifyReply) => Promise<void>;
    }
}
