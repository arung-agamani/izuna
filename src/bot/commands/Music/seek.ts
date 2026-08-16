import { Args, ChatInputCommand, Command } from "@sapphire/framework";
import type { Message } from "discord.js";
import { validateMusicCommandPrerequisites } from "../../../lib/voiceValidation.js";
import { MusicService } from "../../../services/MusicService.js";
import { parseTimeString, fancyTimeFormat } from "../../../lib/utils.js";
import { logError } from "../../../lib/winston.js";

/**
 * Seek Command (Refactored)
 *
 * Seeks to a specific position in the currently playing track.
 * Supports time formats: "ss", "mm:ss", "hh:mm:ss"
 *
 * Migration Status: COMPLETE (full service-layer implementation)
 */
export class SeekCommand extends Command {
    private musicService: MusicService;

    public constructor(context: Command.Context, options: Command.Options) {
        super(context, {
            ...options,
            name: "seek",
            aliases: [],
            description: "Seek to a specific position in the current track",
            detailedDescription: `Seek to a specific position in the currently playing track.

Accepted time formats:
- "40" = 40 seconds
- "1:10" = 1 minute 10 seconds (70 seconds)
- "1:1:10" = 1 hour 1 minute 10 seconds (3670 seconds)

The position must not exceed the track's length.`,
        });

        this.musicService = MusicService.getInstance();
    }

    public override registerApplicationCommands(registry: ChatInputCommand.Registry) {
        registry.registerChatInputCommand((builder) => {
            builder
                .setName("seek")
                .setDescription("Seek to a specific position in the current track")
                .addStringOption((opt) => opt.setName("position").setDescription("Time position (e.g., '40', '1:10', '1:1:10')").setRequired(true));
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
        const positionString = interaction.options.getString("position", true);

        await interaction.deferReply();

        try {
            const formattedTime = await this.seek(guildId, positionString, interaction.channel!);
            await interaction.followUp({
                content: `⏩ Seeked to position ${formattedTime}`,
                ephemeral: true,
            });
        } catch (error) {
            logError("Error in seek command:", error);
            await interaction.followUp({
                content: `❌ Error: ${error instanceof Error ? error.message : "Unknown error"}`,
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
            const positionString = await args.pick("string");
            await this.seek(guildId, positionString, message.channel);
        } catch (error) {
            logError("Error in seek command:", error);
            if (error instanceof Error && error.message.includes("There was no input")) {
                if (message.channel.isSendable()) await message.channel.send("❌ Error: Please provide a time position (e.g., `40`, `1:10`, `1:1:10`)");
            } else {
                if (message.channel.isSendable()) await message.channel.send(`❌ Error: ${error instanceof Error ? error.message : "Unknown error"}`);
            }
        }
    }

    /**
     * Seek to a position in the current track
     * @returns Formatted time string for confirmation
     */
    private async seek(guildId: string, positionString: string, textChannel: any): Promise<string> {
        const session = this.musicService.getSession(guildId);

        if (!session) {
            throw new Error("No active music session in this guild");
        }

        if (!session.isPlaying) {
            await textChannel.send("❌ No track currently playing");
            throw new Error("No track currently playing");
        }

        // Parse time string to seconds
        let positionSeconds: number;
        try {
            positionSeconds = parseTimeString(positionString);
        } catch (error) {
            await textChannel.send(
                `❌ ${error instanceof Error ? error.message : "Invalid time format"}\n` + `Examples: \`40\` (40s), \`1:10\` (1m10s), \`1:1:10\` (1h1m10s)`,
            );
            throw error;
        }

        // Convert to milliseconds
        const positionMs = positionSeconds * 1000;

        // Get current track info
        const currentTrack = session.queue[session.currentPosition];
        if (!currentTrack) {
            throw new Error("No track at current position");
        }

        // Check if track is a live stream (no length)
        if (currentTrack.info.isStream) {
            await textChannel.send("❌ Cannot seek in live streams");
            throw new Error("Cannot seek in live streams");
        }

        try {
            await this.musicService.seekTo(guildId, positionMs);
            const formattedTime = fancyTimeFormat(positionSeconds);
            await textChannel.send(`⏩ Player seeked to position ${formattedTime}`);
            return formattedTime;
        } catch (error) {
            logError("Error seeking track:", error);
            throw error;
        }
    }
}
