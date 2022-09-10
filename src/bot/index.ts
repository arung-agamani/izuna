import { SapphireClient } from "@sapphire/framework";
import { Shoukaku, Connectors } from "shoukaku";
import { config } from "../config";
import { setShoukakuManager } from "../lib/musicQueue";
import logger from "../lib/winston";

async function createBotApp() {
    const client = new SapphireClient({
        intents: ["GUILDS", "GUILD_MESSAGES", "DIRECT_MESSAGES", "DIRECT_MESSAGE_TYPING", "GUILD_VOICE_STATES"],
        regexPrefix: config.botPrefix,
        partials: ["USER", "CHANNEL"],
    });
    const nodes = [
        {
            name: "local",
            // url: "closure-lavalink:2333",
            url: "localhost:2333",
            auth: "youshallnotpass",
        },
    ];
    await client.login(process.env["DISCORD_BOT_TOKEN"]);
    const manager = new Shoukaku(new Connectors.DiscordJS(client), nodes);
    setShoukakuManager(manager);
    // await manager.connect();

    manager.on("error", (_, err) => {
        logger.error(`Shoukaku error.`);
        logger.error(err);
    });
    return client;
}

export default createBotApp;
