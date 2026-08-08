import { ChatInputCommand, Command } from "@sapphire/framework";
import type { Message } from "discord.js";
import { MusicService } from "../../../services/MusicService";
import logger, { logError, getErrorMessage } from "../../../lib/winston"
import { config } from "../../../config";
import { NodeOption } from "shoukaku";
import { fetch } from "undici";
import { requireShoukakuContext } from "../../../services/ShoukakuContext";

/**
 * Refresh Shoukaku Command (Refactored)
 *
 * Admin utility to refresh Lavalink node connections.
 * Stops all active sessions, removes nodes, and re-adds them from config.
 *
 * Migration Status: COMPLETE (full service-layer implementation)
 */
export class RefreshPlayerCommand extends Command {
    private musicService: MusicService;

    public constructor(context: Command.Context, options: Command.Options) {
        super(context, {
            ...options,
            name: "refresh-player",
            aliases: ["refresh-shoukaku", "refresh-nodes"],
            description: "Refresh the Lavalink node connections (Admin only)",
            detailedDescription: `This command purges all Lavalink nodes, re-adds nodes from config, and reinitializes connections.
This will stop all active music sessions across all servers.
This is an admin utility command and should be used only when experiencing connection issues.`,
        });

        this.musicService = MusicService.getInstance();
    }

    public override registerApplicationCommands(registry: ChatInputCommand.Registry) {
        registry.registerChatInputCommand((builder) => {
            builder.setName("refresh-player").setDescription("Refresh Lavalink node connections (Admin only)").setDefaultMemberPermissions(0); // Admin only
        });
    }

    public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
        if (!interaction.guildId) {
            await interaction.reply({
                content: "❌ This command only works in servers",
                ephemeral: true,
            });
            return;
        }

        await interaction.deferReply();

        try {
            await this.refresh(interaction.channel!);
            await interaction.followUp({
                content: "✅ Lavalink nodes refreshed successfully",
            });
        } catch (error) {
            logError("Error refreshing nodes:", error);
            await interaction.followUp({
                content: `❌ Error: ${error instanceof Error ? error.message : "Unknown error"}`,
            });
        }
    }

    public override async messageRun(message: Message) {
        if (!message.guildId) {
            if (message.channel.isSendable()) await message.channel.send("❌ This command only works in servers");
            return;
        }

        // Simple admin check - you can enhance this with proper role checking
        if (!message.member?.permissions.has("Administrator")) {
            if (message.channel.isSendable()) await message.channel.send("❌ This command requires Administrator permissions");
            return;
        }

        try {
            if (message.channel.isSendable()) await this.refresh(message.channel);
        } catch (error) {
            logError("Error refreshing nodes:", error);
            if (message.channel.isSendable()) await message.channel.send(`❌ Error: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
    }

    /**
     * Refresh Shoukaku nodes
     */
    private async refresh(textChannel: any): Promise<void> {
        let shoukaku;
        try {
            shoukaku = requireShoukakuContext();
        } catch (error) {
            await textChannel.send("❌ Shoukaku client is not initialized");
            throw new Error("Shoukaku client not initialized");
        }

        await textChannel.send("🔄 Starting node refresh...");

        // Get all active sessions
        const sessions = MusicService.getSessions();
        const sessionCount = sessions.size;

        if (sessionCount > 0) {
            await textChannel.send(`⚠️ Stopping ${sessionCount} active session(s)...`);

            // Stop all active sessions
            for (const [guildId, session] of sessions) {
                try {
                    await this.musicService.destroySession(guildId);
                    logger.info(`Stopped session for guild ${guildId} during node refresh`);
                } catch (error) {
                    logError(`Error stopping session for guild ${guildId}:`, error);
                }
            }

            await textChannel.send("✅ All sessions stopped");
        }

        // Fetch node configuration
        let nodes: NodeOption[];
        try {
            await textChannel.send("📡 Fetching node configuration...");
            const lavalinkNodeConfig = (await fetch(config.lavalinkConfigPath).then((res) => res.json())) as any;
            nodes = lavalinkNodeConfig;
            await textChannel.send(`✅ Retrieved ${nodes.length} node(s) from config`);
        } catch (error) {
            logError("Error fetching node config:", error);
            await textChannel.send("❌ Failed to fetch node configuration");
            throw error;
        }

        // Add nodes from config (add-only; Shoukaku auto-ejects disconnected nodes)

        await textChannel.send("➕ Adding nodes from configuration...");
        let addedCount = 0;
        for (const node of nodes) {
            try {
                shoukaku.addNode(node);
                logger.info(`Added node: ${node.name}`);
                addedCount++;
            } catch (error) {
                logError(`Error adding node ${node.name}:`, error);
            }
        }
        await textChannel.send(`✅ Added ${addedCount} node(s)`);

        // Wait a bit for connections to establish
        await textChannel.send("⏳ Waiting for nodes to connect...");
        await new Promise((resolve) => setTimeout(resolve, 2000));

        // Check node status
        const connectedNodes = Array.from(shoukaku.nodes.values()).filter((node) => node.state === 1); // State.CONNECTED (shoukaku's State enum is not exported at runtime)
        await textChannel.send(`📊 Node status: ${connectedNodes.length}/${nodes.length} connected`);

        if (connectedNodes.length === 0) {
            await textChannel.send("⚠️ Warning: No nodes are currently connected. Please check Lavalink server status.");
        }

        await textChannel.send("✅ Node refresh complete! You can now use music commands again.");
    }
}
