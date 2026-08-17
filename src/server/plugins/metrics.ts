import fp from "fastify-plugin";
import { register } from "../../lib/metrics.js";

export default fp(async (fastify) => {
    fastify.get("/metrics", async (_req, reply) => {
        reply.header("Content-Type", register.contentType);
        return register.metrics();
    });
});
