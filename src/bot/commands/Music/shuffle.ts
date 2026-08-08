import { ChatInputCommand, Command } from "@sapphire/framework";
import type { Message } from "discord.js";
import { validateMusicCommandPrerequisites } from "../../../lib/voiceValidation";
import { MusicService } from "../../../services/MusicService";
import logger, { logError, getErrorMessage } from "../../../lib/winston"

/**
 * Shuffle Command (Refactored)
 *
 * Shuffles the current playlist while preserving the currently playing track.
 * Uses Fisher-Yates algorithm for true randomization.
 *
 * Migration Status: COMPLETE (full service-layer implementation)
 */
export class ShuffleCommand extends Command {
    private musicService: MusicService;

    public constructor(context: Command.Context, options: Command.Options) {
        super(context, {
            ...options,
            name: "shuffle",
            aliases: ["sh"],
            description: "Shuffle the current playlist",
            detailedDescription: `Shuffle the current playlist using true random algorithm.
The currently playing track will stay at its position, and all other tracks will be shuffled.
If nothing is playing, the entire queue will be shuffled.`,
        });

        this.musicService = MusicService.getInstance();
    }

    public override registerApplicationCommands(registry: ChatInputCommand.Registry) {
        registry.registerChatInputCommand((builder) => {
            builder.setName("shuffle").setDescription("Shuffle the current playlist");
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
            await this.shuffle(guildId, interaction.channel!);
            await interaction.followUp({
                content: "🔀 Playlist shuffled! Use `/nowplaying2` to see the new order.",
                ephemeral: true,
            });
        } catch (error) {
            logError("Error in shuffle command:", error);
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
            await this.shuffle(guildId, message.channel);
        } catch (error) {
            logError("Error in shuffle command:", error);
            if (message.channel.isSendable()) await message.channel.send(`❌ Error: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
    }

    /**
     * Shuffle the playlist
     */
    private async shuffle(guildId: string, textChannel: any): Promise<void> {
        const session = this.musicService.getSession(guildId);

        if (!session) {
            throw new Error("No active music session in this guild");
        }

        if (session.queue.length < 2) {
            await textChannel.send("❌ Queue must have at least 2 tracks to shuffle");
            return;
        }

        try {
            this.musicService.shuffleQueue(guildId);
            await textChannel.send("🔀 Playlist shuffled! Review the shuffled playlist by using `nowplaying2` command.");
        } catch (error) {
            logError("Error shuffling queue:", error);
            throw error;
        }
    }
}
