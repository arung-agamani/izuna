import fastify, { FastifyReply, FastifyRequest } from "fastify";
import fastifyRoutes from "@fastify/routes";
import fastifySwagger from "@fastify/swagger";
import fastifyCors from "@fastify/cors";
import fastifyStatic from "@fastify/static";
import fastifyJwt from "@fastify/jwt";
import fastifyCookie from "@fastify/cookie";
import oauthplugin, { OAuth2Namespace } from "@fastify/oauth2";
import type { SapphireClient } from "@sapphire/framework";
import dotenv from "dotenv";
import path from "path";
import discordOAuth from "discord-oauth2";

import type { IHeaders, IQueryString } from "./interfaces/request";
import apiv1Routes from "./routes/api";
import { config } from "./config";
import createBot from "./bot/index";
import logger from "./lib/winston";
import { init as initReminderFromDb, restartReminderJob } from "./lib/reminder";
import prisma from "./lib/prisma";
import { closureGoogleOauthState, closureGoogleOauthTracker } from "./lib/google";

let botClient: SapphireClient;
if (config.runBot) {
    (async () => {
        botClient = await createBot();
        if (botClient) {
            console.log("all good");
            await initReminderFromDb();
            await restartReminderJob(botClient);
        }
    })();
}

if (config.runWeb) {
    const server = fastify();
    server.register(fastifyStatic, {
        root: path.resolve(__dirname, "..", "web", "dist"),
    });
    server.register(fastifyRoutes);
    server.register(fastifyCors, {
        origin: "*",
        methods: ["GET", "POST", "OPTIONS"],
    });
    server.register(fastifyJwt, {
        secret: process.env["AUTH_SECRET"]!,
        cookie: {
            cookieName: "ninpou",
            signed: false,
        },
    });
    server.register(fastifyCookie);
    server.register(fastifySwagger, {
        routePrefix: "/apidocs",
        swagger: {
            info: {
                title: "Izuna Swagger",
                description: "API Docs for Izuna",
                version: "0.0.1",
            },
            securityDefinitions: {
                apiKey: {
                    type: "apiKey",
                    name: "awooKey",
                    in: "header",
                },
            },
            host: "izuna.howlingmoon.dev",
            schemes: ["http"],
            consumes: ["application/json", "text/plain"],
            produces: ["application/json", "text/plain"],
        },
        hideUntagged: true,
        exposeRoute: true,
    });

    server.addSchema({
        $id: "user",
        type: "object",
        properties: {
            id: {
                type: "string",
                description: "user id",
            },
        },
    });

    server.decorate("authenticate", async function (request: FastifyRequest, response: FastifyReply) {
        try {
            await request.jwtVerify();
        } catch (err) {
            response.send(err);
        }
    });

    server.register(apiv1Routes, {
        prefix: "/api",
    });

    server.register(oauthplugin, {
        name: "googleOAuth2",
        scope: ["profile email", "https://www.googleapis.com/auth/youtube", "https://www.googleapis.com/auth/youtube.readonly"],
        credentials: {
            client: {
                id: process.env["GOOGLE_OAUTH_CLIENT_ID"]!,
                secret: process.env["GOOGLE_OAUTH_CLIENT_SECRET"]!,
            },
            auth: oauthplugin.GOOGLE_CONFIGURATION,
        },
        generateStateFunction: (
            request: FastifyRequest<{
                Querystring: {
                    source: { type: "string" };
                    uid: { type: "string" };
                };
            }>
        ) => {
            const { source, uid } = request.query;
            const state = Buffer.from(`${source}-${uid}`).toString("base64");
            closureGoogleOauthState.add(state);
            return state;
        },
        checkStateFunction: (returnedState: any, callback: any) => {
            if (closureGoogleOauthState.has(returnedState)) {
                callback();
                return;
            }
            callback(new Error("Invalid state"));
        },
        startRedirectPath: "/api/auth/google",
        callbackUri: `${config.domainPrefix}/api/auth/google/callback`,
    });

    server.get<{
        Querystring: {
            state: string;
        };
    }>("/api/auth/google/callback", {}, async (req, _) => {
        const token = await server.googleOAuth2.getAccessTokenFromAuthorizationCodeFlow(req);
        const state = req.query.state || "";
        // console.log(token);
        const decodedState = Buffer.from(state, "base64").toString();
        logger.info(decodedState);
        const [source, uid] = decodedState.split("-");
        logger.info(`Source: ${source} || UID: ${uid}`);
        if (source === "closure" && closureGoogleOauthState.has(state)) {
            closureGoogleOauthTracker.set(uid || "", token.token);
            closureGoogleOauthState.delete(state);
            return {
                status: 200,
                message: `You've authorized Closure to take over your account! Hahahahaha.... jkjk`,
            };
        } else {
            return {
                status: 404,
                message: `You're a stranger. I don't think this is how things should've gone.`,
            };
        }
    });

    server.get<{
        Params: {
            discordUserId: string;
        };
    }>(
        "/api/auth/closure/:discordUserId",
        {
            schema: {
                params: {
                    discordUserId: { type: "string" },
                },
            },
        },
        async (req, reply) => {
            const { discordUserId } = req.params;
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
        }
    );

    server.register(oauthplugin, {
        name: "discordOAuth2",
        scope: ["email", "identify", "guilds", "guilds.members.read"],
        credentials: {
            client: {
                id: process.env["DISCORD_OAUTH_CLIENT_ID"]!,
                secret: process.env["DISCORD_OAUTH_CLIENT_SECRET"]!,
            },
            auth: oauthplugin.DISCORD_CONFIGURATION,
        },
        startRedirectPath: "/api/auth/discord",
        callbackUri: `http://localhost:8000/api/auth/discord/callback`,
    });

    server.get("/api/auth/discord/callback", {}, async (req, reply) => {
        try {
            const token = await server.discordOAuth2.getAccessTokenFromAuthorizationCodeFlow(req);
            const oauth = new discordOAuth();
            const discordUser = await oauth.getUser(token.token.access_token);
            logger.info(`User login from Discord for user ${discordUser.username}#${discordUser.discriminator}`);
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
                    expiresIn: "1h",
                }
            );
            reply
                .setCookie("ninpou", signingToken, {
                    domain: "localhost",
                    path: "/",
                    secure: false,
                    httpOnly: true,
                    sameSite: false,
                })
                .redirect("/");
        } catch (error) {
            console.log(error);
            logger.error(error);
            reply.code(500).send({
                statusCode: 500,
                error: "Something went wrong.",
            });
        }
    });

    server.setNotFoundHandler((_req, res) => {
        res.sendFile("index.html");
    });

    server.listen({ port: config.port, host: config.host }, (err, address) => {
        if (err) {
            logger.error(err);
            process.exit(1);
        }
        logger.info(`Server is listening at ${address}`);
        server.swagger();
    });
}

declare module "fastify" {
    interface FastifyInstance {
        googleOAuth2: OAuth2Namespace;
        discordOAuth2: OAuth2Namespace;
        authenticate: (req: FastifyRequest, res: FastifyReply) => Promise<void>;
    }
}

declare module "@fastify/jwt" {
    interface FastifyJWT {
        user: {
            id: number;
        };
    }
}

export interface FastifyDiscordOAuthBody {
    user: {
        id: number;
        uid: string;
        name: string;
        email: string;
        dateCreated: string;
    };
    token: {
        access_token: string;
        expires_in: number;
        refresh_token: string;
        scope: string;
        token_type: string;
        expires_at: string;
    };
}
