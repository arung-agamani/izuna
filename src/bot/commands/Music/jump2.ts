import { Args, ChatInputCommand, Command } from "@sapphire/framework";
import type { Message } from "discord.js";
import { validateMusicCommandPrerequisites } from "../../../lib/voiceValidation";
import { MusicService } from "../../../services/MusicService";
import logger from "../../../lib/winston";

/**
 * Jump Command (Refactored)
 *
 * Set the next play head to selected track number from queue.
 * The targeted track will be played after the current playing track ends.
 *
 * Migration Status: COMPLETE (full service-layer implementation)
 */
export class JumpCommandRefactored extends Command {
    private musicService: MusicService;

    public constructor(context: Command.Context, options: Command.Options) {
        super(context, {
            ...options,
            name: "jump2",
            aliases: ["jump-new", "jump-v2", "j2"],
            description: "Set the next play head to selected track number from queue",
            detailedDescription: `Set the next play head to selected track number from playlist/queue.
            This command won't immediately stop the current playing track.
            The targeted track will be played after the current playing track ends.
            This means that using "skip" command after this command will play the targeted track immediately.`,
        });

        this.musicService = MusicService.getInstance();
    }

    public override registerApplicationCommands(registry: ChatInputCommand.Registry) {
        registry.registerChatInputCommand((builder) => {
            builder
                .setName("jump2")
                .setDescription("Jump to a specific track in the queue")
                .addIntegerOption((opt) => opt.setName("position").setDescription("Track position (1-based)").setRequired(true).setMinValue(1));
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

        await interaction.deferReply();

        try {
            await this.jumpToTrack(guildId, position, interaction.channel!);
            await interaction.followUp({ content: "Jump command complete!", ephemeral: true });
        } catch (error) {
            logger.error("Error in jump command (slash):", error);
            await interaction.followUp({
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
            await message.channel.send(validation.error!);
            return;
        }

        const guildId = message.guildId!;

        try {
            const position = await args.pick("integer");
            await this.jumpToTrack(guildId, position, message.channel);
        } catch (error: any) {
            if (error.identifier) {
                // Sapphire argument error
                await message.channel.send("Error: Please provide a valid track number (positive integer)");
            } else {
                logger.error("Error in jump command (message):", error);
                await message.channel.send(`Error: ${error.message || "Unknown error"}`);
            }
        }
    }

    private async jumpToTrack(guildId: string, position: number, channel: any) {
        // Check if session exists
        const session = this.musicService.getSession(guildId);
        if (!session) {
            await channel.send("No active music session. Use `play2` to start playing music.");
            return;
        }

        const queue = this.musicService.getQueue(guildId);
        const stats = this.musicService.getQueueStats(guildId);

        if (!queue || queue.length === 0) {
            await channel.send("Queue is empty. Add some tracks first!");
            return;
        }

        // Convert to 0-based index
        const targetIndex = position - 1;

        if (targetIndex < 0 || targetIndex >= queue.length) {
            await channel.send(`Invalid track position. Queue has ${queue.length} tracks (1-${queue.length})`);
            return;
        }

        const targetTrack = queue[targetIndex];

        // If nothing is currently playing and we're at the end, play immediately
        if (!stats?.isPlaying && stats?.currentPosition === queue.length) {
            await this.musicService.jumpAndPlay(guildId, targetIndex);
            await channel.send(`▶️ Now playing: **${targetTrack.info.title}**`);
        } else {
            // Set up to play after current track ends
            this.musicService.jumpToTrack(guildId, targetIndex + 1); // +1 because jumpToTrack expects it to play next
            await channel.send(`⏭️ Set the play head to track ${position}: **${targetTrack.info.title}**`);

            if (stats?.isPlaying) {
                await channel.send("💡 Use `skip2` to play it immediately.");
            }
        }
    }
}
