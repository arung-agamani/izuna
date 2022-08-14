import type { FastifyInstance, FastifyPluginOptions } from "fastify";
import prisma from "../../../lib/prisma";
import logger from "../../../lib/winston";

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
            return {
                message: "here will be baseline for user API",
                user: req.user,
            };
        }
    );

    fastify.get("/user/me", { onRequest: [fastify.authenticate] }, async (req, res) => {
        const user = await prisma.user.findUnique({ where: { id: req.user.id } });
        logger.debug("/user/me request for id " + req.user.id);
        if (!user) {
            res.code(404).send({
                message: "user not found",
            });
            return;
        }
        res.send({
            data: user,
        });
    });

    fastify.get("/user/reminder", { onRequest: [fastify.authenticate] }, async (req, _res) => {
        const decodedValue = fastify.jwt.decode<{ uid: string }>(req.cookies["ninpou"]!)!;
        const userReminder = await prisma.reminder.findMany({
            where: {
                uid: decodedValue.uid,
            },
        });
        return {
            data: userReminder,
        };
    });
}

export default routes;
