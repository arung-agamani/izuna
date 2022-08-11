import type { FastifyInstance, FastifyPluginOptions } from "fastify";
import prisma from "../../../lib/prisma";

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
                user: req.user,
            };
        }
    );

    fastify.get(
        "/user/reminder",
        { onRequest: [fastify.authenticate] },
        async (req, _res) => {
            const decodedValue = fastify.jwt.decode<{ uid: string }>(
                req.cookies["ninpou"]!
            )!;
            const userReminder = await prisma.reminder.findMany({
                where: {
                    uid: decodedValue.uid,
                },
            });
            return {
                data: userReminder,
            };
        }
    );
}

export default routes;
