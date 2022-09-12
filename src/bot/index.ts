import { SapphireClient } from "@sapphire/framework";
import { Shoukaku, Connectors } from "shoukaku";
import { config } from "../config";
import { setShoukakuManager } from "../lib/musicQueue";
import logger from "../lib/winston";
import prisma from "../lib/prisma";

async function createBotApp() {
    const client = new SapphireClient({
        intents: ["GUILDS", "GUILD_MESSAGES", "DIRECT_MESSAGES", "DIRECT_MESSAGE_TYPING", "GUILD_VOICE_STATES"],
        regexPrefix: config.botPrefix,
        partials: ["USER", "CHANNEL"],
    });
    const nodes = [
        {
            name: "local",
            url: "closure-lavalink:2333",
            // url: "localhost:2333",
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

    client.on("messageCreate", async (message) => {
        if (message.content === "Awoo?") {
            await message.reply("Awoo!");
            return;
        }
        if (message.content.split("#").length >= 3) {
            const msgSplit = message.content.split("#");
            let foundTag = "";
            for (let i = 0; i < (msgSplit.length - 1) / 2; i++) {
                if (msgSplit[2 * i + 1] !== "") {
                    foundTag = msgSplit[2 * i + 1]!;
                    break;
                }
            }
            if (foundTag === "") {
                return;
            }
            const tag = await prisma.tag.findFirst({
                where: {
                    userId: message.author.id,
                    name: foundTag,
                },
            });
            if (!tag) {
                await message.channel.send(`No tag **${foundTag}** found for this user.`);
                return;
            }
            if (tag.isMedia) {
                await message.channel.send({
                    files: [
                        {
                            attachment: tag.message,
                        },
                    ],
                });
                return;
            }
            await message.channel.send(`${tag.message}`);
            return;
        }
    });
    return client;
}

export default createBotApp;
