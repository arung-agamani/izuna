import { ChatInputCommand, Command } from "@sapphire/framework";
import type { Message } from "discord.js";
import { validateMusicCommandPrerequisites } from "../../../lib/voiceValidation";
import { MusicService } from "../../../services/MusicService";
import logger, { logError, getErrorMessage } from "../../../lib/winston"

/**
 * Pause/Resume Command (Refactored)
 *
 * Pause or resume the currently playing music.
 *
 * Migration Status: COMPLETE (full service-layer implementation)
 */
export class PauseCommand extends Command {
    private musicService: MusicService;

    public constructor(context: Command.Context, options: Command.Options) {
        super(context, {
            ...options,
            name: "pause",
            aliases: ["resume", "continue"],
            description: "Pause/continue playing music",
            detailedDescription: `This command pauses and resumes the currently playing music player in a server.
            It acts as a simple toggle that will change the state to the opposite state.
            It's... as straightforward as it could be.
            But this won't make the player play if player reached the end of playlist and thus stopped.
            You'll need to use the jump command.`,
        });

        this.musicService = MusicService.getInstance();
    }

    public override registerApplicationCommands(registry: ChatInputCommand.Registry) {
        registry.registerChatInputCommand((builder) => {
            builder.setName("pause").setDescription("Pause/Resume currently playing track");
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

        try {
            const message = await this.togglePause(guildId);
            await interaction.reply(message);
        } catch (error) {
            logError("Error in pause command (slash):", error);
            await interaction.reply({
                content: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
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
            const responseMessage = await this.togglePause(guildId);
            if (message.channel.isSendable()) await message.channel.send(responseMessage);
        } catch (error) {
            logError("Error in pause command (message):", error);
            if (message.channel.isSendable()) await message.channel.send(`Error: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
    }

    private async togglePause(guildId: string): Promise<string> {
        // Check if session exists
        const session = this.musicService.getSession(guildId);
        if (!session) {
            return "No active music session. Use `play2` to start playing music.";
        }

        const stats = this.musicService.getQueueStats(guildId);
        if (!stats?.isPlaying) {
            return "Nothing is currently playing. Use `play2` or `jump2` to start playing.";
        }

        // Toggle pause state
        const isPaused = await this.musicService.pause(guildId);

        return isPaused ? "⏸️ Paused..." : "▶️ Resuming...";
    }
}
