import { ChatInputCommand, Command } from "@sapphire/framework";
import type { Message } from "discord.js";
import { validateMusicCommandPrerequisites } from "../../../lib/voiceValidation";
import { MusicService } from "../../../services/MusicService";
import logger from "../../../lib/winston";

/**
 * Skip Music Command (Refactored)
 *
 * Skips the currently playing track and plays the next one in queue.
 *
 * Migration Status: COMPLETE (full service-layer implementation)
 * - Uses MusicService for session and skip logic
 * - No legacy musicQueue dependency
 */
export class SkipMusicCommand extends Command {
    private musicService: MusicService;

    public constructor(context: Command.Context, options: Command.Options) {
        super(context, {
            ...options,
            name: "skip",
            aliases: ["s"],
            description: "Skip currently playing track",
            detailedDescription: `Skip the currently playing track and play the next one in the queue.`,
        });

        this.musicService = MusicService.getInstance();
    }

    public override registerApplicationCommands(registry: ChatInputCommand.Registry) {
        registry.registerChatInputCommand((builder) => {
            builder.setName("skip").setDescription("Skip currently playing track");
        });
    }

    public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
        // Validate prerequisites
        const validation = validateMusicCommandPrerequisites({
            guildId: interaction.guildId,
            guild: interaction.guild,
            textChannel: interaction.channel,
            member: interaction.member as any,
            botId: interaction.client.id!,
        });

        if (!validation.valid) {
            await interaction.reply({
                content: validation.error!,
                ephemeral: true,
            });
            return;
        }

        const guildId = interaction.guildId!;
        await interaction.deferReply();

        try {
            await this.skip(guildId, interaction.channel!);
            await interaction.followUp({
                content: "✅ Skipped to next track",
                ephemeral: true,
            });
        } catch (error) {
            logger.error("Error in skip command:", error);
            await interaction.followUp({
                content: `❌ Error: ${error instanceof Error ? error.message : "Unknown error"}`,
                ephemeral: true,
            });
        }
    }

    public override async messageRun(message: Message) {
        // Validate prerequisites
        const validation = validateMusicCommandPrerequisites({
            guildId: message.guildId,
            guild: message.guild,
            textChannel: message.channel,
            member: message.member,
            botId: message.client.id!,
        });

        if (!validation.valid) {
            if (message.channel.isSendable()) await message.channel.send(validation.error!);
            return;
        }

        const guildId = message.guildId!;

        try {
            await this.skip(guildId, message.channel);
        } catch (error) {
            logger.error("Error in skip command:", error);
            if (message.channel.isSendable()) await message.channel.send(`❌ Error: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
    }

    /**
     * Skip the current track
     */
    private async skip(guildId: string, textChannel: any): Promise<void> {
        const session = this.musicService.getSession(guildId);

        if (!session) {
            throw new Error("No active music session in this guild");
        }

        if (!session.isPlaying) {
            await textChannel.send("❌ Nothing is currently playing");
            return;
        }

        try {
            // Stop the current track (triggers "end" event which plays next track)
            await session.player.stopTrack();
            await textChannel.send("⏭️ Skipping current track");
        } catch (error) {
            logger.error("Error stopping track:", error);
            throw new Error("Failed to skip track");
        }
    }
}
