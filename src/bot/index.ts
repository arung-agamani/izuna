import { SapphireClient } from "@sapphire/framework";
import { Shoukaku, Connectors, NodeOption, ShoukakuOptions } from "shoukaku";
import { config } from "../config";
import { setShoukakuContext } from "../services/ShoukakuContext";
import logger from "../lib/winston";
import prisma from "../lib/prisma";
import { channelTrackingManager, deleteFromEphemeralVCManager, initializeChannelTrackingManager, initializeJoinToCreateVCManager } from "../lib/channelTracker";
import { Message, Partials, VoiceBasedChannel } from "discord.js";
import "@sapphire/plugin-hmr/register";

async function createBotApp() {
    const client = new SapphireClient({
        intents: [
            "Guilds",
            "GuildMessages",
            "DirectMessages",
            "DirectMessages",
            "DirectMessageTyping",
            "GuildVoiceStates",
            "MessageContent",
            "GuildMessageReactions",
        ],
        regexPrefix: config.botPrefix,
        partials: [Partials.User, Partials.Channel, Partials.Reaction, Partials.Message],
        loadMessageCommandListeners: true,
        hmr: {
            enabled: process.env["NODE_ENV"] === "development",
        },
    });

    const nodes: NodeOption[] = [];
    if (config.useLocalLavalink) {
        logger.info("Using local lavalink node");
        nodes.push({
            name: "local",
            url: "localhost:2333",
            auth: "youshallnotpass"
        });
    } else if (config.lavalinkConfigPath) {
        const lavalinkNodeConfig = await (globalThis as any).fetch(config.lavalinkConfigPath).then((res: any) => res.json());
        for (const node of lavalinkNodeConfig) {
            logger.info(`Added ${node.name} to lavalink node pool`);
            nodes.push(node);
        }
    }
    
    if (!process.env["MUTE"] && process.env["MUTE"] !== "1") { 
        logger.info("Initializing Shoukaku connector");
        const option: ShoukakuOptions = {
            resume: true,
            resumeTimeout: 60,
            resumeByLibrary: true,
            moveOnDisconnect: true,
            reconnectTries: 5,
            reconnectInterval: 5,
            restTimeout: 60,
            voiceConnectionTimeout: 15,
        }
        const manager = new Shoukaku(new Connectors.DiscordJS(client), nodes, option);
        setShoukakuContext(manager);
        logger.info("Shoukaku manager initialized with nodes:", nodes.map(node => node.name).join(", "));
        manager.on("error", (node, err) => {
            logger.error("Shoukaku connection error", {
                node: node || "unknown",
                error: err instanceof Error ? err.message : String(err),
                stack: err instanceof Error ? err.stack : undefined,
            });
        });
        manager.on("ready", () => {
            logger.info("✅ Shoukaku manager ready", {
                nodes: manager.nodes.size,
            });
        });
    }
    await client.login(process.env["DISCORD_BOT_TOKEN"]);
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
            try {
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
            } catch (err) {
                logger.error("Tag lookup failed", { foundTag, error: err });
                return;
            }

            // Resolve reply target: if the user is replying to a message, respond to that message instead
            let replyTarget: Message | undefined;
            if (message.reference?.messageId) {
                try {
                    replyTarget = await message.channel.messages.fetch(message.reference.messageId);
                } catch {
                    // message deleted or inaccessible — fall through to channel send
                }
            }

            const respond = async (content: string | { content: string }) => {
                if (replyTarget) {
                    await replyTarget.reply(content);
                } else if (message.channel.isSendable()) {
                    await message.channel.send(content);
                }
            };

            if (!tag) {
                await respond(`No tag **${foundTag}** found.`);
                return;
            }
            if (tag.isMedia) {
                await respond({ content: tag.message });
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
            await respond(tag.message);
            return;
        }
    });

    setInterval(() => {
        (async () => {
            const guildChannelPairs = Array.from(channelTrackingManager.entries());
            for (const [guildChannel] of guildChannelPairs) {
                const [guildId, channelId] = guildChannel.split("-");
                let guild, channel;
                try {
                    guild = await client.guilds.fetch(guildId!);
                } catch (error) {
                    continue;
                }
                try {
                    channel = (await guild.channels.fetch(channelId!)) as VoiceBasedChannel;
                } catch (error) {
                    await deleteFromEphemeralVCManager(guildId!, channelId!);
                    continue;
                }
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
