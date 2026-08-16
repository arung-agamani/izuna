import { SapphireClient } from "@sapphire/framework";
import { Shoukaku, Connectors, NodeOption, ShoukakuOptions } from "shoukaku";
import { config } from "../config/index.js";
import { setLavalinkManager } from "../services/LavalinkService.js";
import logger from "../lib/winston.js";
import { handleTagMessage } from "./handlers/tagHandler.js";
import { channelTrackingManager, deleteFromEphemeralVCManager, initializeChannelTrackingManager, initializeJoinToCreateVCManager } from "../lib/channelTracker.js";
import { Partials, VoiceBasedChannel } from "discord.js";

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
        setLavalinkManager(manager);
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
        await handleTagMessage(message);
    });

    setInterval(() => {
        (async () => {
            const guildChannelPairs = Array.from(channelTrackingManager.entries());
            for (const [guildChannel] of guildChannelPairs) {
                const [guildId, channelId] = guildChannel.split("-");
                let guild, channel;
                try {
                    guild = await client.guilds.fetch(guildId!);
                } catch {
                    continue;
                }
                try {
                    channel = (await guild.channels.fetch(channelId!)) as VoiceBasedChannel;
                } catch {
                    await deleteFromEphemeralVCManager(guildId!, channelId!);
                    continue;
                }
                if (channel?.members.size === 0) {
                    try {
                        await guild.channels.delete(channelId!);
                    } catch {
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
