import { SapphireClient } from "@sapphire/framework";
import { config } from "../config";

function createBotApp() {
    const client = new SapphireClient({
        intents: ["GUILDS", "GUILD_MESSAGES"],
        regexPrefix: config.botPrefix,
    });
    client.login(process.env["DISCORD_BOT_TOKEN"]);
    return client;
}

export default createBotApp;
