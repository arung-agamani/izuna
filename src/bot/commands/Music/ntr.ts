import { ChatInputCommand, Command } from "@sapphire/framework";
import type { Message } from "discord.js";
import { validateMusicCommandPrerequisites } from "../../../lib/voiceValidation";
import { MusicService } from "../../../services/MusicService";
import logger from "../../../lib/winston";

/**
 * NTR/VCMove Command (Refactored)
 *
 * Forcefully pulls the bot into the voice channel you're currently in.
 * Maintains playback while moving between channels.
 *
 * Migration Status: COMPLETE (full service-layer implementation)
 */
export class NtrCommand extends Command {
    private musicService: MusicService;

    public constructor(context: Command.Context, options: Command.Options) {
        super(context, {
            ...options,
            name: "ntr",
            aliases: ["vcmove", "cmere", "come"],
            description: "Pull the music player into your voice channel",
            detailedDescription: `Forcefully pull the bot into the voice channel you're currently in.
If the bot is playing music in another channel, it will move to your channel while continuing playback.
You must be in a voice channel to use this command.`,
        });

        this.musicService = MusicService.getInstance();
    }

    public override registerApplicationCommands(registry: ChatInputCommand.Registry) {
        registry.registerChatInputCommand((builder) => {
            builder.setName("ntr").setDescription("Pull the music player into your voice channel forcefully");
        });
    }

    public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
        // Validate prerequisites (but don't require same channel - that's the point of this command)
        if (!interaction.guildId) {
            await interaction.reply({
                content: "❌ This command only works in servers",
                ephemeral: true,
            });
            return;
        }

        if (!interaction.guild) {
            await interaction.reply({
                content: "❌ Guild not found",
                ephemeral: true,
            });
            return;
        }

        const voiceChannel = interaction.guild.members.cache.get(interaction.user.id)?.voice.channel;
        if (!voiceChannel) {
            await interaction.reply({
                content: "❌ You must be in a voice channel first",
                ephemeral: true,
            });
            return;
        }

        const guildId = interaction.guildId;
        await interaction.deferReply();

        try {
            await this.moveBot(guildId, voiceChannel.id, interaction.guild, interaction.channel!);
            await interaction.followUp({
                content: "✅ Coming to your channel!",
                ephemeral: true,
            });
        } catch (error) {
            logger.error("Error in ntr command:", error);
            await interaction.followUp({
                content: `❌ Error: ${error instanceof Error ? error.message : "Unknown error"}`,
                ephemeral: true,
            });
        }
    }

    public override async messageRun(message: Message) {
        if (!message.guildId) {
            if (message.channel.isSendable()) await message.channel.send("❌ This command only works in servers");
            return;
        }

        if (!message.guild) {
            if (message.channel.isSendable()) await message.channel.send("❌ Guild not found");
            return;
        }

        if (!message.member?.voice.channel) {
            if (message.channel.isSendable()) await message.channel.send("❌ You must be in a voice channel first");
            return;
        }

        const guildId = message.guildId;
        const voiceChannel = message.member.voice.channel;

        try {
            await this.moveBot(guildId, voiceChannel.id, message.guild, message.channel);
        } catch (error) {
            logger.error("Error in ntr command:", error);
            if (message.channel.isSendable()) await message.channel.send(`❌ Error: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
    }

    /**
     * Move the bot to a different voice channel
     */
    private async moveBot(guildId: string, newVoiceChannelId: string, guild: any, textChannel: any): Promise<void> {
        const session = this.musicService.getSession(guildId);

        if (!session) {
            await textChannel.send("❌ No active music session in this guild. Use `/play2` to start playing music first.");
            throw new Error("No active music session");
        }

        // Check if already in the target channel
        if (session.voiceChannelId === newVoiceChannelId) {
            await textChannel.send("❌ I'm already in your voice channel!");
            return;
        }

        // Get the new voice channel
        const newVoiceChannel = guild.channels.cache.get(newVoiceChannelId);
        if (!newVoiceChannel || !newVoiceChannel.isVoiceBased()) {
            throw new Error("Invalid voice channel");
        }

        try {
            await this.musicService.moveToChannel(guildId, newVoiceChannel, guild);
            await textChannel.send("✅ Yes, yes, I'm coming!");
        } catch (error) {
            logger.error("Error moving to channel:", error);

            // Display the error message to the user (MusicService provides user-friendly messages)
            if (error instanceof Error) {
                await textChannel.send(error.message);
            } else {
                await textChannel.send("❌ Failed to move to voice channel. Please check my permissions.");
            }

            throw error;
        }
    }
}
