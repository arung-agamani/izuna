import fastify from "fastify";
import fastifyRoutes from "@fastify/routes";
import fastifySwagger from "@fastify/swagger";
import type { IHeaders, IQueryString } from "./interfaces/request";
import apiv1Routes from "./routes/api";
import { config } from "./config";
import createBot from "./bot/index";

import dotenv from "dotenv";
import path from "path";
const dotenvResult = dotenv.config({
    path: path.resolve(__dirname, "..", ".env"),
});
if (dotenvResult.error) {
    console.error(dotenvResult.error);
    process.exit(1);
}

if (process.env["NODE_ENV"] === "development") {
    console.log("Application is running in development mode");
}

const botClient = createBot();

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

server.decorate("bot", {
    client: botClient,
});

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
        console.error(err);
        process.exit(1);
    }
    console.log(`Server is listening at ${address}`);
    server.swagger();
});
