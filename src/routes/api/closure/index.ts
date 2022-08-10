import type { FastifyInstance, FastifyPluginOptions } from "fastify";

async function routes(fastify: FastifyInstance, _: FastifyPluginOptions) {
    fastify.get("/test", async (_req, _res) => {
        return {
            status: 200,
            message: "hello",
        };
    });

    fastify.get(
        "/user",
        {
            onRequest: [fastify.authenticate],
        },
        async (req, _res) => {
            const cookieValue = req.cookies["ninpou"]!;
            const decodedValue = fastify.jwt.decode<{
                name: string;
                role: string;
            }>(cookieValue)!;
            return {
                message: "here will be baseline for user API",
                decoded: decodedValue.name,
            };
        }
    );

    fastify.get("/user/reminder", async (_req, _res) => {
        return {
            message: "here will be API for retrieving user's reminder",
        };
    });
}

export default routes;
