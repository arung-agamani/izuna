import fp from "fastify-plugin";
import rateLimit from "@fastify/rate-limit";

export default fp(async (fastify) => {
    await fastify.register(rateLimit, {
        max: 100, // default: 100 requests per window
        timeWindow: "1 minute",
        // Auth endpoints get their own stricter limit via route config
    });
});
