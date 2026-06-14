import dotenv from "dotenv";
dotenv.config();

// Sentry Initialization
import * as Sentry from "@sentry/node";
import { env } from "./config/env";

Sentry.init({
    dsn: env.SENTRY_DNS,
    tracesSampleRate: 1.0,
    environment: env.NODE_ENV === "development" ? "development" : "production",
});

import type { SapphireClient } from "@sapphire/framework";
import { config } from "./config";
import createBot from "./bot/index";
import logger from "./lib/winston";
import ReminderService from "./services/ReminderService";
import { startWebServer } from "./app";

let botClient: SapphireClient | null = null;

async function initializeBot() {
    if (!config.runBot) {
        logger.info("config.runBot is disabled - Discord bot will not start");
        return;
    }

    try {
        logger.info("🤖 Starting Discord bot initialization...");
        botClient = await createBot();

        if (!botClient) {
            throw new Error("createBot() returned null or undefined");
        }

        logger.info("✅ Bot client created successfully");

        // Initialize reminder system with its own error handling
        try {
            logger.info("📅 Initializing ReminderService...");
            const reminderService = ReminderService.getInstance();
            await reminderService.initialize(botClient);
            logger.info("✅ Reminder system fully initialized");
        } catch (reminderError) {
            logger.error("⚠️ Failed to initialize reminder system (non-critical):", reminderError);
            logger.warn("💡 Bot will continue without reminder functionality");
        }

        logger.info("✅ Bot initialization complete");
    } catch (error) {
        logger.error("❌ Critical error during bot initialization:", error);
        logger.warn("⚠️ Application continuing without Discord bot");
    }
}

async function main() {
    try {
        logger.info("🚀 Izuna initialization starting...");

        // Initialize bot if enabled
        await initializeBot();

        // Start web server if enabled
        if (config.runWeb) {
            await startWebServer(config.port, config.host);
        } else {
            logger.info("config.runWeb is disabled - Web server will not start");
        }

        logger.info("✅ Izuna fully initialized and ready");
    } catch (error) {
        logger.error("❌ Fatal error during initialization:", error);
        process.exit(1);
    }
}

main().catch((error) => {
    logger.error("❌ Uncaught error:", error);
    process.exit(1);
});

declare module "@fastify/jwt" {
    interface FastifyJWT {
        user: {
            id: number;
            uid: string;
        };
    }
}
