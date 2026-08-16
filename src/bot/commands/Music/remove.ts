import { Args, ChatInputCommand, Command } from "@sapphire/framework";
import type { Message } from "discord.js";
import { validateMusicCommandPrerequisites } from "../../../lib/voiceValidation.js";
import { MusicService } from "../../../services/MusicService.js";
import { logError } from "../../../lib/winston.js";

/**
 * Remove Command (Refactored)
 *
 * Remove a certain track from the music queue.
 *
 * Migration Status: COMPLETE (full service-layer implementation)
 */
export class RemoveCommand extends Command {
    private musicService: MusicService;

    public constructor(context: Command.Context, options: Command.Options) {
        super(context, {
            ...options,
            name: "remove",
            aliases: ["delete", "rm"],
            description: "Remove a certain track from music queue",
            detailedDescription: `Remove a track from music queue based on track's position.
            This command uses 1-based indexing, which means first track will have track position 1, and so on.
            You can use "nowplaying", "np", "queue" commands to check the current playlist.
            Cannot remove currently playing track - use skip instead.`,
        });

        this.musicService = MusicService.getInstance();
    }

    public override registerApplicationCommands(registry: ChatInputCommand.Registry) {
        registry.registerChatInputCommand((builder) => {
            builder
                .setName("remove")
                .setDescription("Remove a track from the queue")
                .addIntegerOption((opt) => opt.setName("position").setDescription("Track position to remove (1-based)").setRequired(true).setMinValue(1));
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
        const position = interaction.options.getInteger("position", true);

        try {
            const message = await this.removeTrack(guildId, position);
            await interaction.reply(message);
        } catch (error) {
            logError("Error in remove command (slash):", error);
            await interaction.reply({
                content: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
                ephemeral: true,
            });
        }
    }

    public override async messageRun(message: Message, args: Args) {
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
            const position = await args.pick("integer");
            const responseMessage = await this.removeTrack(guildId, position);
            if (message.channel.isSendable()) await message.channel.send(responseMessage);
        } catch (error: any) {
            if (error.identifier) {
                // Sapphire argument error
                if (message.channel.isSendable()) await message.channel.send("Error: Please provide a valid track number (positive integer)");
            } else {
                logError("Error in remove command (message):", error);
                if (message.channel.isSendable()) await message.channel.send(`Error: ${error.message || "Unknown error"}`);
            }
        }
    }

    private async removeTrack(guildId: string, position: number): Promise<string> {
        // Check if session exists
        const session = this.musicService.getSession(guildId);
        if (!session) {
            return "No active music session. Use `play2` to start playing music.";
        }

        const queue = this.musicService.getQueue(guildId);

        if (!queue || queue.length === 0) {
            return "Queue is empty. Nothing to remove!";
        }

        // Convert to 0-based index
        const trackIndex = position - 1;

        if (trackIndex < 0 || trackIndex >= queue.length) {
            return `Invalid track position. Queue has ${queue.length} tracks (1-${queue.length})`;
        }

        try {
            // Remove the track
            const removedTrack = this.musicService.removeTrack(guildId, trackIndex);
            return `🗑️ Removed track **${removedTrack.info.title}** from the queue.`;
        } catch (error: any) {
            // Handle specific error for currently playing track
            if (error.message && error.message.includes("Cannot remove currently playing track")) {
                return "❌ Cannot remove currently playing track. Use `skip2` command instead.";
            }
            throw error;
        }
    }
}
