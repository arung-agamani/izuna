import type { FastifyInstance, FastifyPluginOptions } from "fastify";
import { UserRepository } from "../../../repositories/UserRepository";
import prisma from "../../../lib/prisma";
import { JWT_EXPIRY } from "../../../config/constants";

const userRepo = new UserRepository(prisma);

async function authRoutes(fastify: FastifyInstance, _opts: FastifyPluginOptions) {
    // POST /auth/refresh — refresh JWT (accepts recently-expired tokens within 7-day grace)
    fastify.post("/refresh", async (req, reply) => {
        try {
            await req.jwtVerify({ ignoreExpiration: true });
        } catch {
            return reply.status(401).send({ error: "Invalid token" });
        }

        const payload = req.user as { id: number; uid: string; exp?: number } | undefined;
        if (!payload?.id || !payload?.uid) {
            return reply.status(401).send({ error: "Invalid token payload" });
        }

        const GRACE_PERIOD_SECONDS = 7 * 24 * 60 * 60;
        if (payload.exp && Date.now() / 1000 > payload.exp + GRACE_PERIOD_SECONDS) {
            return reply.status(401).send({ error: "Session expired, please re-login" });
        }

        const user = await userRepo.findById(payload.id);
        if (!user) {
            return reply.status(401).send({ error: "User not found" });
        }

        const newToken = await reply.jwtSign({ id: user.id, uid: user.uid, aud: "izuna" }, { expiresIn: JWT_EXPIRY });

        return reply
            .setCookie("ninpou", newToken, {
                path: "/",
                httpOnly: true,
                secure: process.env["NODE_ENV"] !== "development",
                sameSite: "lax",
            })
            .send({ success: true });
    });

    // GET /auth/me — current user profile
    fastify.get("/me", { onRequest: [fastify.authenticate] }, async (req, reply) => {
        const user = await userRepo.findById(req.user.id);
        if (!user) {
            return reply.status(404).send({ error: "User not found" });
        }

        return reply.send({
            data: {
                id: user.id,
                uid: user.uid,
                name: user.name,
                email: user.email,
            },
        });
    });
}

export default authRoutes;
