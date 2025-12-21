import { Args, ChatInputCommand, Command } from "@sapphire/framework";
import type { Message } from "discord.js";
import { validateMusicCommandPrerequisites } from "../../../lib/voiceValidation";
import { MusicService } from "../../../services/MusicService";
import logger from "../../../lib/winston";

/**
 * Move Command (Refactored)
 *
 * Move selected track to new position in the queue.
 *
 * Migration Status: COMPLETE (full service-layer implementation)
 */
export class MoveCommandRefactored extends Command {
    private musicService: MusicService;

    public constructor(context: Command.Context, options: Command.Options) {
        super(context, {
            ...options,
            name: "move2",
            aliases: ["move-new", "move-v2", "mv2"],
            description: "Move selected track to new position",
            detailedDescription: `Move selected track to new position. Requires two arguments: track's position to move and desired track position.
            Track will be moved in-place without carrying the play head position.
            This means that moving currently playing track will not carry the play head.

            Example:
            Currently playing playlist: 
            1. track1
            2. track2 <- Play head
            3. track3

            Using "move2 2 1" will result to:
            1. track2
            2. track1 <- Play head
            3. track3`,
        });

        this.musicService = MusicService.getInstance();
    }

    public override registerApplicationCommands(registry: ChatInputCommand.Registry) {
        registry.registerChatInputCommand((builder) => {
            builder
                .setName("move2")
                .setDescription("Move a track to a different position in the queue")
                .addIntegerOption((opt) => opt.setName("from").setDescription("Current track position (1-based)").setRequired(true).setMinValue(1))
                .addIntegerOption((opt) => opt.setName("to").setDescription("Destination position (1-based)").setRequired(true).setMinValue(1));
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
        const fromPosition = interaction.options.getInteger("from", true);
        const toPosition = interaction.options.getInteger("to", true);

        try {
            const message = await this.moveTrack(guildId, fromPosition, toPosition);
            await interaction.reply(message);
        } catch (error) {
            logger.error("Error in move command (slash):", error);
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
            await message.channel.send(validation.error!);
            return;
        }

        const guildId = message.guildId!;

        try {
            const fromPosition = await args.pick("integer");
            const toPosition = await args.pick("integer");
            const responseMessage = await this.moveTrack(guildId, fromPosition, toPosition);
            await message.channel.send(responseMessage);
        } catch (error: any) {
            if (error.identifier) {
                // Sapphire argument error
                await message.channel.send("Error: Please provide two valid track numbers (positive integers)");
            } else {
                logger.error("Error in move command (message):", error);
                await message.channel.send(`Error: ${error.message || "Unknown error"}`);
            }
        }
    }

    private async moveTrack(guildId: string, fromPosition: number, toPosition: number): Promise<string> {
        // Check if session exists
        const session = this.musicService.getSession(guildId);
        if (!session) {
            return "No active music session. Use `play2` to start playing music.";
        }

        const queue = this.musicService.getQueue(guildId);

        if (!queue || queue.length === 0) {
            return "Queue is empty. Add some tracks first!";
        }

        // Convert to 0-based indices
        const fromIndex = fromPosition - 1;
        const toIndex = toPosition - 1;

        if (fromIndex < 0 || fromIndex >= queue.length) {
            return `Invalid source position. Queue has ${queue.length} tracks (1-${queue.length})`;
        }

        if (toIndex < 0 || toIndex >= queue.length) {
            return `Invalid destination position. Queue has ${queue.length} tracks (1-${queue.length})`;
        }

        if (fromIndex === toIndex) {
            return "Source and destination positions are the same. No move needed.";
        }

        // Move the track
        const movedTrack = this.musicService.moveTrack(guildId, fromIndex, toIndex);

        return `✅ Moved track **${movedTrack.info.title}** from position ${fromPosition} to position ${toPosition}`;
    }
}
