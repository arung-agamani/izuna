import dotenv from "dotenv";
dotenv.config();
import fastify, { FastifyReply, FastifyRequest } from "fastify";
import fastifyRoutes from "@fastify/routes";
import fastifySwagger from "@fastify/swagger";
import fastifyCors from "@fastify/cors";
import fastifyStatic from "@fastify/static";
import fastifyJwt from "@fastify/jwt";
import fastifyCookie from "@fastify/cookie";
import oauthplugin, { OAuth2Namespace } from "@fastify/oauth2";
import type { SapphireClient } from "@sapphire/framework";
import path from "path";
import discordOAuth from "discord-oauth2";

import apiv1Routes from "./routes/api";
import { config } from "./config";
import createBot from "./bot/index";
import logger from "./lib/winston";
import { init as initReminderFromDb, restartReminderJob } from "./lib/reminder";
import prisma from "./lib/prisma";
import { closureGoogleOauthState, closureGoogleOauthTracker } from "./lib/google";
import { oauthSessionState } from "./lib/session";
import { getMusicManager, getShoukakuManager } from "./lib/musicQueue";

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

process.on("SIGTERM", async () => {
    console.log("SIGTERM received. Performing cleanup...");
    const manager = getShoukakuManager();
    const musicManager = getMusicManager();
    if (!manager) {
        console.log("No shoukaku manager found");
        process.exit(0);
    }
    const promises: any[] = [];
    musicManager.forEach((connectedGuild) => {
        console.log(`Processing cleanup on guild connection ${connectedGuild.player.guildId}`);
        const player = connectedGuild.player;
        const playerData = player.data;
        const connectionData = connectedGuild.player.node.manager.connections.get(playerData.guildId)!;
        const p = prisma.playerSession.upsert({
            where: {
                guildId: playerData.guildId,
            },
            create: {
                guildId: playerData.guildId,
                sessionId: playerData.playerOptions.voice?.sessionId,
                connectionData: JSON.stringify(connectionData),
                playerData: JSON.stringify(playerData),
            },
            update: {
                sessionId: playerData.playerOptions.voice?.sessionId,
                connectionData: JSON.stringify(connectionData),
                playerData: JSON.stringify(playerData),
            },
        });
        promises.push(p);
    });
    Promise.allSettled(promises);
    console.log("Done cleanup. Exiting...");
    process.exit(0);
});
// and SIGINT on dev
process.on("SIGINT", async () => {
    console.log("SIGINT received. Performing cleanup...");
    const manager = getShoukakuManager();
    const musicManager = getMusicManager();
    if (!manager) {
        console.log("No shoukaku manager found");
        process.exit(0);
    }
    for (const connectedGuild of musicManager.values()) {
        console.log(`Processing cleanup on guild connection ${connectedGuild.player.guildId}`);
        try {
            const player = connectedGuild.player;
            const playerData = player.data;
            const connectionData = connectedGuild.player.node.manager.connections.get(playerData.guildId)!;
            console.log("Pre write", {
                guildId: connectedGuild.player.guildId,
                sessionId: "",
                connectionData: "",
                playerData: "",
            });
            const p = await prisma.playerSession.upsert({
                where: {
                    guildId: playerData.guildId,
                },
                create: {
                    guildId: playerData.guildId,
                    sessionId: playerData.playerOptions.voice?.sessionId,
                    connectionData: JSON.stringify({}),
                    playerData: JSON.stringify(playerData),
                },
                update: {
                    sessionId: playerData.playerOptions.voice?.sessionId,
                    connectionData: JSON.stringify({}),
                    playerData: JSON.stringify(playerData),
                },
            });
            console.log("Post write haha");
            // await message.channel.send(`Saving ${playerData.guildId}`);
        } catch (error) {
            console.log("Error happened when saving player data");
            console.log(error);
        }
    }
    console.log("Done cleanup. Exiting...");
    process.exit(0);
});
// TODO: Properly serialize and deserialize required data
/** Identified structure
 * Node -> Need Manager and NodeOptions (for storing node).
 * manager is runtime so save NodeOptoins
 * Player -> Need guildId and Node
 * Connection -> Need Manager and VoiceChannelOptions. Idk if this closely relate but it can be
 * Basically try to rebuild the joinVoiceChannel function but without actually connecting to discord
 * https://github.com/shipgirlproject/Shoukaku/blob/master/src/Shoukaku.ts#L247
 * Just try to establish the required connection between client and Lavalink and let the rest run
 *
 * Also try to see if there is something needed on the other end (lavalink) aside from resuming session
 */
if (config.runWeb) {
    const server = fastify();
    server.register(fastifyStatic, {
        root: path.resolve(__dirname, "..", "web", "dist"),
    });
    server.register(fastifyRoutes);
    server.register(fastifyCors, {
        origin:
            process.env["NODE_ENV"] === "development"
                ? ["http://localhost:5173", "http://localhost:8000", "https://izuna.howlingmoon.dev"]
                : ["https://izuna.howlingmoon.dev"],
        methods: ["GET", "POST", "OPTIONS"],
        credentials: true,
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
        generateStateFunction: (
            req: FastifyRequest<{
                Querystring: {
                    r: string; // redirect link
                    i: string; // initiator
                };
            }>
        ) => {
            const stateObj = { redirect: req.query.r === "null" ? Buffer.from("/").toString("base64") : req.query.r, initiator: req.query.i || "web" };
            // console.log("State obj: ", stateObj);
            // console.log("Origin request: ", req.url)
            // TODO: validate if request header has referer and it's from authorized referer
            let state = JSON.stringify(stateObj);
            state = Buffer.from(state).toString("base64");
            oauthSessionState.add(state);
            return state;
        },
        checkStateFunction: (returnedState: any, callback: any) => {
            if (oauthSessionState.has(returnedState)) {
                callback();
                return;
            }
            callback(new Error("Invalid state"));
        },
        startRedirectPath: "/api/auth/discord",
        callbackUri: `${process.env["NODE_ENV"] === "development" ? "http://localhost:8000" : "https://izuna.howlingmoon.dev"}/api/auth/discord/callback`,
    });

    server.get<{
        Querystring: {
            state: string;
            error: string;
        };
    }>("/api/auth/discord/callback", {}, async (req, reply) => {
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
            // if (req.query.error && req.query.error === "access_denied") {
            //     reply.redirect(decodeURIComponent(redirectUrl));
            //     return;
            // }
            const token = await server.discordOAuth2.getAccessTokenFromAuthorizationCodeFlow(req);
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
                    expiresIn: "1h",
                }
            );
            oauthSessionState.delete(state);
            reply
                .setCookie("ninpou", signingToken, {
                    domain: process.env["NODE_ENV"] === "development" ? "localhost" : "howlingmoon.dev",
                    path: "/",
                    secure: true,
                    httpOnly: true,
                    sameSite: "strict",
                })
                .redirect(decodeURIComponent(redirectUrl));
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
