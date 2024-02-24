import { SapphireClient } from "@sapphire/framework";
import { Shoukaku, Connectors, Player, Node, Connection } from "shoukaku";
import { config } from "../config";
import { setShoukakuManager } from "../lib/musicQueue";
import logger from "../lib/winston";
import prisma from "../lib/prisma";
import { channelTrackingManager, deleteFromEphemeralVCManager, initializeChannelTrackingManager, initializeJoinToCreateVCManager } from "../lib/channelTracker";
import { Partials, VoiceBasedChannel } from "discord.js";
import "@sapphire/plugin-hmr/register";

async function createBotApp() {
    const client = new SapphireClient({
        intents: ["Guilds", "GuildMessages", "DirectMessages", "DirectMessages", "DirectMessageTyping", "GuildVoiceStates", "MessageContent"],
        regexPrefix: config.botPrefix,
        partials: [Partials.User, Partials.Channel],
        loadMessageCommandListeners: true,
        hmr: {
            enabled: process.env["NODE_ENV"] === "development",
        },
    });
    const nodes = [];
    if (process.env["NODE_ENV"] === "development") {
        nodes.push({
            name: "local",
            url: "localhost:2333",
            auth: "youshallnotpass",
        });
    } else {
        nodes.push({
            name: "kureya",
            url: "kureya.howlingmoon.dev:14045",
            auth: process.env["KUREYA_LAVALINK_PASSWORD"]!,
        });
    }
    await client.login(process.env["DISCORD_BOT_TOKEN"]);
    if (!process.env["MUTE"] && process.env["MUTE"] !== "1") {
        logger.info("Initializing Shoukaku connector");
        const manager = new Shoukaku(new Connectors.DiscordJS(client), nodes, {
            resume: true,
            resumeByLibrary: true,
        });

        setShoukakuManager(manager);
        manager.on("error", (_, err) => {
            logger.error(`Shoukaku error.`);
            logger.error(err);
            console.log(err);
        });
        manager.on("ready", () => {
            logger.info("Shoukaku manager is ready");
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
        if (message.content.split(process.env["NODE_ENV"] === "development" ? "&" : "#").length >= 3) {
            const msgSplit = message.content.split(process.env["NODE_ENV"] === "development" ? "&" : "#");
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
            const AlphanumericRegex = /^[A-Za-z0-9]+$/;
            if (!AlphanumericRegex.test(foundTag)) {
                return;
            }
            let tag = null;
            tag = await prisma.tag.findFirst({
                where: {
                    userId: message.author.id,
                    isGuild: false,
                    name: foundTag,
                },
            });
            if (!tag) {
                tag = await prisma.tag.findFirst({
                    where: {
                        guildId: message.guildId || "",
                        isGuild: true,
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
                logger.debug({
                    message: `${tag.message} invoked`,
                    label: {
                        handler: "tag_index",
                        source: "messageCreate",
                        tag: tag.message,
                    },
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
                // logger.debug(`Poll: Fetching guild ${guildId}`);
                let guild;
                let channel;
                try {
                    guild = await client.guilds.fetch(guildId!);
                } catch (error) {
                    // logger.debug(`Poll: Fetching guild ${guildId} failed`);
                    continue;
                }
                // logger.debug(`Poll: Fetching channel ${channelId}`);
                try {
                    channel = (await guild.channels.fetch(channelId!)) as VoiceBasedChannel;
                } catch (error) {
                    // logger.debug(`Poll: Fetching channel ${channelId} failed`);
                    await deleteFromEphemeralVCManager(guildId!, channelId!);
                    continue;
                }
                // logger.debug(`Poll: Checking ${guild.name}-${channel?.name} for it's members. Members: ${channel.members.size}`);
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
