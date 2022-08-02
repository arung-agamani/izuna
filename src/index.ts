import fastify from "fastify";
import fastifyRoutes from "@fastify/routes";
import fastifySwagger from "@fastify/swagger";
import type { IHeaders, IQueryString } from "./interfaces/request";
import apiv1Routes from "./routes/api";
// import googleOauth from "./routes/api/auth/google";
import { config } from "./config";
import createBot from "./bot/index";
import logger from "./lib/winston";
import { init as initReminderFromDb, restartReminderJob } from "./lib/reminder";
import dotenv from "dotenv";
import path from "path";

import type { SapphireClient } from "@sapphire/framework";
import oauthplugin, { OAuth2Namespace } from "@fastify/oauth2";

if (process.env["NODE_ENV"] === "development") {
    logger.info("Application is running in development mode");
    dotenv.config({ path: path.resolve(__dirname, "..", ".env") });
} else {
    logger.info("Application is running in production mode");
}

let botClient: SapphireClient;

(async () => {
    botClient = createBot();
    if (botClient) {
        console.log("all good");
        await initReminderFromDb();
        await restartReminderJob(botClient);
    }
})();

const server = fastify();

server.register(fastifyRoutes);
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

server.register(apiv1Routes, {
    prefix: "/api",
});

server.register(oauthplugin, {
    name: "googleOAuth2",
    scope: ["profile email"],
    credentials: {
        client: {
            id: process.env["GOOGLE_OAUTH_CLIENT_ID"]!,
            secret: process.env["GOOGLE_OAUTH_CLIENT_SECRET"]!,
        },
        auth: oauthplugin.GOOGLE_CONFIGURATION,
    },
    startRedirectPath: "/api/auth/google",
    callbackUri: `${config.domainPrefix}/api/auth/google/callback`,
});

server.get("/api/auth/google/callback", {}, async (req, _) => {
    const token =
        await server.googleOAuth2.getAccessTokenFromAuthorizationCodeFlow(req);
    console.log(token);
    return {
        status: 200,
        message: "Logged in!",
    };
});
// server.register(googleOauth);

server.get("/", async (_req, res) => {
    res.send({
        status: 200,
        message: "Hello!",
    });
});

server.get<{
    Querystring: IQueryString;
    Headers: IHeaders;
}>(
    "/awoo",
    {
        schema: {
            operationId: "awooRoute",
            description: "awoo!",
            tags: ["tierlist"],
            summary: "api that awoos",
            params: {
                $ref: "user#",
            },

            response: {
                201: {
                    description: "success uwu",
                    type: "object",
                    properties: {
                        status: { type: "number" },
                        message: { type: "string" },
                    },
                },
                default: {
                    description: "default response",
                    type: "object",
                    properties: {
                        status: { type: "number" },
                        message: { type: "string" },
                    },
                },
            },
        },
    },
    async (req, _res) => {
        const { username, password } = req.query;
        const awooHeader = req.headers["x-awoo-signature"];

        return {
            status: 200,
            message: `you tried to login as ${username} using '${password}' as the password`,
            headers: {
                "x-awoo-signature": awooHeader,
            },
        };
    }
);
server.listen({ port: config.port, host: config.host }, (err, address) => {
    if (err) {
        logger.error(err);
        process.exit(1);
    }
    logger.info(`Server is listening at ${address}`);
    server.swagger();
});

declare module "fastify" {
    interface FastifyInstance {
        googleOAuth2: OAuth2Namespace;
    }
}
