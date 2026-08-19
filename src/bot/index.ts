import { SapphireClient } from "@sapphire/framework";
import { Shoukaku, Connectors, NodeOption, ShoukakuOptions } from "shoukaku";
import { config } from "../config/index.js";
import { setLavalinkManager, setLavalinkNodeManager, getLavalinkManager } from "../services/LavalinkService.js";
import logger, { logError } from "../lib/winston.js";
import { handleTagMessage } from "./handlers/tagHandler.js";
import { channelTrackingManager, deleteFromEphemeralVCManager, initializeChannelTrackingManager, initializeJoinToCreateVCManager } from "../lib/channelTracker.js";
import { Partials, VoiceBasedChannel } from "discord.js";
import { LavalinkNodeManager } from "../services/LavalinkNodeManager.js";
import { KeyValueRepository } from "../repositories/KeyValueRepository.js";
import { PublicLavalinkNodeService } from "../services/PublicLavalinkNodeService.js";
import prisma from "../lib/prisma.js";

async function createBotApp() {
    const client = new SapphireClient({
        // Sapphire scans <baseUserDirectory>/commands, /listeners, etc. for pieces.
        // Set it explicitly to this module's directory (build/bot/ or src/bot/):
        // package.json "main" points at the app entry (build/index.js), so the
        // auto-detected root (build/) misses the pieces nested under bot/.
        baseUserDirectory: import.meta.dirname,
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
    
    let nodeManager: LavalinkNodeManager | null = null;

    if (!process.env["MUTE"] && process.env["MUTE"] !== "1") { 
        logger.info("Initializing Shoukaku connector");
        nodeManager = new LavalinkNodeManager(
            new KeyValueRepository(prisma),
            PublicLavalinkNodeService.instance,
            getLavalinkManager,
            Number(process.env["LAVALINK_MAX_PUBLIC_NODES"] ?? "3"),
        );
        const nm = nodeManager;
        const option: ShoukakuOptions = {
            resume: true,
            resumeTimeout: 60,
            resumeByLibrary: true,
            moveOnDisconnect: true,
            reconnectTries: 5,
            reconnectInterval: 5,
            restTimeout: 60,
            voiceConnectionTimeout: 15,
            nodeResolver: nodeManager.nodeResolver(),
        }
        const manager = new Shoukaku(new Connectors.DiscordJS(client), nodes, option);
        setLavalinkManager(manager);
        // Register error/ready handlers BEFORE adding any node — a connection failure
        // during syncNodes() would otherwise emit 'error' with no listener and Node
        // throws ERR_UNHANDLED_ERROR, masking the real cause.
        manager.on("error", (node, err) => {
            const isError = err instanceof Error;
            logError("Shoukaku connection error", err, {
                node: node || "unknown",
                code: isError && "code" in err ? (err as Error & { code?: unknown }).code : undefined,
                cause: isError && err.cause instanceof Error ? err.cause.message : undefined,
            });
            nm.recordError(node, err);
        });
        manager.on("ready", () => {
            logger.info("✅ Shoukaku manager ready", {
                nodes: manager.nodes.size,
            });
        });
        setLavalinkNodeManager(nodeManager);
        logger.info("Shoukaku manager initialized with nodes:", nodes.map(node => node.name).join(", "));
    }
    await client.login(process.env["DISCORD_BOT_TOKEN"]);
    // Sync the public node pool only after login — Shoukaku refuses to connect any
    // node until the connector sets the bot user id on 'clientReady'.
    if (nodeManager) {
        await nodeManager.syncNodes();
    }
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
