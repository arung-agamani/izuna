import { FastifyPluginAsync, FastifyReply } from "fastify";
import discordOAuth from "discord-oauth2";
import prisma from "../../lib/prisma.js";
import { oauthSessionState } from "../../lib/session.js";
import { config } from "../../config/index.js";
import { COOKIE_NAME, JWT_EXPIRY } from "../../config/constants.js";
import { logError } from "../../lib/winston.js";
import { AuthService } from "../../services/AuthService.js";
import { UserRepository } from "../../repositories/UserRepository.js";
const userRepo = new UserRepository(prisma);

const authService = AuthService.getInstance();
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

        const user = await userRepo.findById(payload.id);
        if (!user) {
            return reply.status(401).send({ message: "User not found" });
        }

        const newToken = await reply.jwtSign(
            { id: user.id, uid: user.uid, aud: "izuna" },
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
            onRequest: [fastify.authenticate],
            schema: {
                params: {
                    discordUserId: { type: "string" },
                },
            },
        },
        async (req, reply) => {
            const { discordUserId } = req.params;
            const { closureGoogleOauthTracker } = await import("../../lib/google.js");

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

            const parsedState = authService.validateState(state, oauthSessionState);
            if (!parsedState) {
                reply.status(403).send({
                    success: false,
                    message: "誰だお前。。。",
                });
                return;
            }

            const redirectUrl = authService.decodeRedirect(parsedState.redirect);

            const token = await fastify.discordOAuth2.getAccessTokenFromAuthorizationCodeFlow(req);
            const oauth = new discordOAuth();
            const discordUser = await oauth.getUser(token.token.access_token);

            const user = await authService.processDiscordLogin(
                { id: discordUser.id, username: discordUser.username, email: discordUser.email ?? undefined },
                {
                    accessToken: token.token.access_token,
                    refreshToken: token.token.refresh_token || "",
                    expiresIn: Number(token.token.expires_in) || undefined,
                },
            );

            const signingToken = await reply.jwtSign(
                { id: user.id, uid: user.uid, aud: "izuna" },
                { expiresIn: JWT_EXPIRY },
            );

            oauthSessionState.delete(state);

            setAuthCookie(reply, signingToken).redirect(decodeURIComponent(redirectUrl));
        } catch (error) {
            logError("Discord OAuth callback failed", error);
            reply.status(500).send({
                statusCode: 500,
                error: "Something went wrong.",
            });
        }
    });
};

export default discordOAuthRoutes;
