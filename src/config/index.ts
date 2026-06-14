import { env } from "./env";
import logger from "../lib/winston";
import dotenv from "dotenv";
import path from "path";

// Load .env file in development
if (env.NODE_ENV === "development") {
    logger.info("Application is running in development mode");
    dotenv.config({ path: path.resolve(__dirname, "..", "..", ".env") });
} else {
    logger.info(`Application initiated at ${new Date().toLocaleString()}`);
    logger.info("Application is running in production mode");
}

// Domain and URL helpers
const getDomain = (): string => {
    return env.NODE_ENV === "development" ? "localhost" : "howlingmoon.dev";
};

const getDomainPrefix = (): string => {
    return env.NODE_ENV === "development" ? "http://localhost:8000" : "https://izuna.howlingmoon.dev";
};

const getSwaggerHost = (): string => {
    return env.NODE_ENV === "development" ? "localhost:8000" : "izuna.howlingmoon.dev";
};

const getSwaggerSchemes = (): string[] => {
    return env.NODE_ENV === "development" ? ["http", "https"] : ["https"];
};

export const config = {
    // Server
    host: env.NODE_ENV === "development" ? "localhost" : "0.0.0.0",
    port: 8000,

    // Features
    runBot: env.RUN_BOT,
    runWeb: env.RUN_WEB,

    // Bot
    botPrefix: env.NODE_ENV === "development" ? new RegExp("^idev[,! ]", "i") : new RegExp("^izuna[,! ]", "i"),
    botToken: env.DISCORD_BOT_TOKEN,
    lavalinkConfigPath: env.LAVALINK_CONFIG_PATH,
    useLocalLavalink: env.USE_LOCAL_LAVALINK,

    // Credentials
    ownerUsers: ["145558597424644097"],
    betaTesters: ["145558597424644097"],

    // URLs and domains
    domainPrefix: getDomainPrefix(),
    domain: getDomain(),
    swaggerHost: getSwaggerHost(),
    swaggerSchemes: getSwaggerSchemes(),

    // Utilities
    getOAuthCallbackUri: (provider: "google" | "discord"): string => {
        return `${config.domainPrefix}/api/auth/${provider}/callback`;
    },
};
