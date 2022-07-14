import { SapphireClient } from "@sapphire/framework";

function createBotApp() {
    const client = new SapphireClient({
        intents: ["GUILDS", "GUILD_MESSAGES"],
        regexPrefix: new RegExp("^closure[,! ]", "i"),
    });
    client.login(process.env["DISCORD_BOT_TOKEN"]);
    return client;
}

export default createBotApp;
