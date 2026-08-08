import { FastifyPluginAsync, FastifyRequest, FastifyReply } from "fastify";
import discordOAuth from "discord-oauth2";
import prisma from "../../lib/prisma";
import { oauthSessionState, discordAccessTokens } from "../../lib/session";
import { config } from "../../config";
import { COOKIE_NAME, JWT_EXPIRY } from "../../config/constants";
import logger, { logError } from "../../lib/winston"

const GRACE_PERIOD_SECONDS = 7 * 24 * 60 * 60; // 7 days

const setAuthCookie = (reply: FastifyReply, token: string) => {
    return reply.setCookie(COOKIE_NAME, token, {
        domain: config.domain,
        path: "/",
        secure: config.domain !== "localhost",
        httpOnly: true,
        sameSite: "lax",
    });
};

const discordOAuthRoutes: FastifyPluginAsync = async (fastify) => {
    // Token refresh endpoint — accepts recently expired JWTs within grace period
    fastify.post("/auth/refresh", async (req, reply) => {
        try {
            await req.jwtVerify({ ignoreExpiration: true });
        } catch {
            return reply.status(401).send({ message: "Invalid token" });
        }

        const payload = req.user as { id: number; uid: string; exp?: number } | undefined;
        if (!payload?.id || !payload?.uid) {
            return reply.status(401).send({ message: "Invalid token payload" });
        }

        if (payload.exp && Date.now() / 1000 > payload.exp + GRACE_PERIOD_SECONDS) {
            return reply.status(401).send({ message: "Session expired, please re-login" });
        }

        const user = await prisma.user.findUnique({ where: { id: payload.id } });
        if (!user) {
            return reply.status(401).send({ message: "User not found" });
        }

        const newToken = await reply.jwtSign(
            { id: user.id, uid: user.uid },
            { expiresIn: JWT_EXPIRY },
        );

        setAuthCookie(reply, newToken).send({ success: true });
    });

    // Closure authentication check endpoint
    fastify.get<{
        Params: {
            discordUserId: string;
        };
    }>(
        "/auth/closure/:discordUserId",
        {
            schema: {
                params: {
                    discordUserId: { type: "string" },
                },
            },
        },
        async (req, reply) => {
            const { discordUserId } = req.params;
            const { closureGoogleOauthTracker } = await import("../../lib/google");

            // check if we have already authenticated this user
            const isAuth = closureGoogleOauthTracker.get(discordUserId);

            // if not, redirect to google auth
            if (!isAuth) {
                reply.redirect(302, `/api/auth/google?source=closure&uid=${discordUserId}`);
            } else {
                reply.send({
                    status: "success",
                    message: `You're already authenticated. Awoo to you ${discordUserId}`,
                });
            }
        },
    );

    // Discord OAuth callback endpoint
    fastify.get<{
        Querystring: {
            state: string;
            error: string;
        };
    }>("/auth/discord/callback", {}, async (req, reply) => {
        try {
            const state = req.query.state;

            if (!oauthSessionState.has(state)) {
                reply.status(403).send({
                    success: false,
                    message: "誰だお前。。。",
                });
                return;
            }

            const decodedState = Buffer.from(state, "base64").toString();
            const parsedState = JSON.parse(decodedState) as { redirect: string; initiator: string };
            const redirectUrl = Buffer.from(parsedState.redirect, "base64").toString();

            const token = await fastify.discordOAuth2.getAccessTokenFromAuthorizationCodeFlow(req);
            const oauth = new discordOAuth();
            const discordUser = await oauth.getUser(token.token.access_token);

            logger.info(`User login from Discord for user ${discordUser.username}`);

            let user = await prisma.user.findUnique({
                where: {
                    uid: discordUser.id,
                },
            });

            if (!user) {
                user = await prisma.user.create({
                    data: {
                        uid: discordUser.id,
                        name: discordUser.username,
                        email: discordUser.email || "",
                        dateCreated: new Date(),
                    },
                });
            }

            discordAccessTokens.set(discordUser.id, {
                access_token: token.token.access_token,
                refresh_token: token.token.refresh_token || "",
                expires_at: Date.now() + (Number(token.token.expires_in) || 604800) * 1000,
            });

            await prisma.user.update({
                where: { id: user.id },
                data: {
                    discordAccessToken: token.token.access_token,
                    discordRefreshToken: token.token.refresh_token || "",
                },
            });

            const signingToken = await reply.jwtSign(
                {
                    id: user.id,
                    uid: user.uid,
                },
                {
                    expiresIn: JWT_EXPIRY,
                },
            );

            oauthSessionState.delete(state);

            setAuthCookie(reply, signingToken).redirect(decodeURIComponent(redirectUrl));
        } catch (error) {
            logger.error(error);
            reply.status(500).send({
                statusCode: 500,
                error: "Something went wrong.",
            });
        }
    });
};

export default discordOAuthRoutes;
