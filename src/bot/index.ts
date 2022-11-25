import { SapphireClient } from "@sapphire/framework";
import { Shoukaku, Connectors } from "shoukaku";
import { config } from "../config";
import { setShoukakuManager } from "../lib/musicQueue";
import logger from "../lib/winston";
import prisma from "../lib/prisma";
import { channelTrackingManager, deleteFromEphemeralVCManager, initializeChannelTrackingManager, initializeJoinToCreateVCManager } from "../lib/channelTracker";
import type { VoiceBasedChannel } from "discord.js";

async function createBotApp() {
    const client = new SapphireClient({
        intents: ["GUILDS", "GUILD_MESSAGES", "DIRECT_MESSAGES", "DIRECT_MESSAGE_TYPING", "GUILD_VOICE_STATES"],
        regexPrefix: config.botPrefix,
        partials: ["USER", "CHANNEL"],
        loadMessageCommandListeners: true,
    });
    const nodes = [
        {
            name: "local",
            url: "closure-lavalink:2333",
            // url: "airi.howlingmoon.dev:2333",
            auth: "youshallnotpass",
        },
        {
            name: "kureya",
            url: "kureya.howlingmoon.dev:14045",
            auth: process.env["KUREYA_LAVALINK_PASSWORD"]!,
        },
    ];
    await client.login(process.env["DISCORD_BOT_TOKEN"]);
    if (!process.env["MUTE"] && process.env["MUTE"] !== "1") {
        const manager = new Shoukaku(new Connectors.DiscordJS(client), nodes);
        setShoukakuManager(manager);
        // await manager.connect();
        manager.on("error", (_, err) => {
            logger.error(`Shoukaku error.`);
            logger.error(err);
        });
    }
    await initializeJoinToCreateVCManager();
    await initializeChannelTrackingManager();
    client.on("messageCreate", async (message) => {
        if (message.author.bot) return;
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
            let tag = null;
            if (message.inGuild()) {
                tag = await prisma.tag.findFirst({
                    where: {
                        guildId: message.guildId,
                        name: foundTag,
                    },
                });
            } else {
                tag = await prisma.tag.findFirst({
                    where: {
                        userId: message.author.id,
                        name: foundTag,
                    },
                });
            }
            if (!tag) {
                await message.channel.send(`No tag **${foundTag}** found.`);
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

    setInterval(() => {
        (async () => {
            const guildChannelPairs = Array.from(channelTrackingManager.entries());
            for (const [guildChannel] of guildChannelPairs) {
                const [guildId, channelId] = guildChannel.split("-");
                logger.debug(`Poll: Fetching guild ${guildId}`);
                let guild;
                let channel;
                try {
                    guild = await client.guilds.fetch(guildId!);
                } catch (error) {
                    logger.debug(`Poll: Fetching guild ${guildId} failed`);
                    continue;
                }
                logger.debug(`Poll: Fetching channel ${channelId}`);
                try {
                    channel = (await guild.channels.fetch(channelId!)) as VoiceBasedChannel;
                } catch (error) {
                    logger.debug(`Poll: Fetching channel ${channelId} failed`);
                    await deleteFromEphemeralVCManager(guildId!, channelId!);
                    continue;
                }
                logger.debug(`Poll: Checking ${guild.name}-${channel?.name} for it's members. Members: ${channel.members.size}`);
                if (channel?.members.size === 0) {
                    try {
                        await guild.channels.delete(channelId!);
                    } catch (error) {
                        logger.warn(`${channel.name} has already deleted or non-existent or error`);
                    }
                    await deleteFromEphemeralVCManager(guildId!, channelId!);
                }
            }
        })();
    }, 5000);
    return client;
}

export default createBotApp;
