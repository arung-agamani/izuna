import { SapphireClient } from "@sapphire/framework";
import type { ThreadChannel } from "discord.js";

function createBotApp() {
    const client = new SapphireClient({
        intents: ["GUILDS", "GUILD_MESSAGES"],
        regexPrefix: new RegExp("^sugar[,! ]", "i"),
    });
    client.login(process.env["DISCORD_BOT_TOKEN"]);
    (
        client.guilds.cache
            .get("688349293970849812")
            ?.channels.cache.get("1009656928852516914") as ThreadChannel
    ).send("Mrr.... oharo----gonyaimas.... （＞人＜；）");
    return client;
}

export default createBotApp;
