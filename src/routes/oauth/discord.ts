import { FastifyPluginAsync, FastifyRequest, FastifyReply } from "fastify";
import discordOAuth from "discord-oauth2";
import prisma from "../../lib/prisma";
import { oauthSessionState } from "../../lib/session";
import { config } from "../../config";
import { COOKIE_NAME, JWT_EXPIRY } from "../../config/constants";
import logger from "../../lib/winston";
import { FastifyDiscordOAuthBody } from "../../types";

const discordOAuthRoutes: FastifyPluginAsync = async (fastify) => {
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

            const signingToken = await reply.jwtSign(
                {
                    id: user.id,
                    user,
                    token: token.token,
                },
                {
                    expiresIn: JWT_EXPIRY,
                },
            );

            oauthSessionState.delete(state);

            reply
                .setCookie(COOKIE_NAME, signingToken, {
                    domain: config.domain,
                    path: "/",
                    secure: true,
                    httpOnly: true,
                    sameSite: "strict",
                })
                .redirect(decodeURIComponent(redirectUrl));
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
