import { Args, ChatInputCommand, Command } from "@sapphire/framework";
import type { Message } from "discord.js";
import { validateMusicCommandPrerequisites } from "../../../lib/voiceValidation";
import { MusicService } from "../../../services/MusicService";
import logger, { logError, getErrorMessage } from "../../../lib/winston"

const aliases = {
    single: ["one", "1", "single", "this"],
    playlist: ["all", "entire", "playlist"],
    none: ["none", "0", "off", "disable", "stop"],
};

/**
 * Loop/Repeat Command (Refactored)
 *
 * Loop through the queue in various ways.
 *
 * Migration Status: COMPLETE (full service-layer implementation)
 */
export class LoopCommand extends Command {
    private musicService: MusicService;

    public constructor(context: Command.Context, options: Command.Options) {
        super(context, {
            ...options,
            name: "loop",
            aliases: ["repeat"],
            description: `Loop through the queue in various ways. Options: "all", "one", "none"`,
            detailedDescription: `Loop through the playlist. Requires one argument.
            There are two looping methods:

            Single-track loop: This will repeat only the currently playing track.
            Playlist loop: This will reset the playhead to the beginning of playlist after it reached the end.

            Aliases for loop modes:
            - single: "one", "1", "single", "this"
            - playlist: "all", "entire", "playlist"
            - none: "none", "0", "off", "disable", "stop"`,
        });

        this.musicService = MusicService.getInstance();
    }

    public override registerApplicationCommands(registry: ChatInputCommand.Registry) {
        registry.registerChatInputCommand((builder) => {
            builder
                .setName("loop2")
                .setDescription("Set loop/repeat mode")
                .addStringOption((opt) =>
                    opt
                        .setName("mode")
                        .setDescription("Loop mode")
                        .setRequired(true)
                        .addChoices(
                            { name: "Single Track", value: "single" },
                            { name: "Entire Playlist", value: "playlist" },
                            { name: "Disable Loop", value: "none" },
                        ),
                );
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
        const mode = interaction.options.getString("mode", true);

        try {
            const message = await this.setLoopMode(guildId, mode);
            await interaction.reply(message);
        } catch (error) {
            logError("Error in loop command (slash):", error);
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
            const loopMode = await args.pick("string");
            const responseMessage = await this.setLoopMode(guildId, loopMode);
            if (message.channel.isSendable()) await message.channel.send(responseMessage);
        } catch (error: any) {
            if (error.identifier) {
                // Sapphire argument error
                if (message.channel.isSendable()) await message.channel.send('No arguments given. Please specify "all", "one", or "none"');
            } else {
                logError("Error in loop command (message):", error);
                if (message.channel.isSendable()) await message.channel.send(`Error: ${error.message || "Unknown error"}`);
            }
        }
    }

    private async setLoopMode(guildId: string, modeInput: string): Promise<string> {
        // Check if session exists
        const session = this.musicService.getSession(guildId);
        if (!session) {
            return "No active music session. Use `play2` to start playing music.";
        }

        const lowerMode = modeInput.toLowerCase();

        // Determine the actual mode from aliases
        let mode: "no" | "single" | "playlist";

        if (aliases.playlist.includes(lowerMode)) {
            mode = "playlist";
        } else if (aliases.single.includes(lowerMode)) {
            mode = "single";
        } else if (aliases.none.includes(lowerMode)) {
            mode = "no";
        } else {
            return 'Invalid loop mode. Please use "all" (playlist), "one" (single track), or "none" (disable).';
        }

        // Set the repeat mode
        this.musicService.setRepeatMode(guildId, mode);

        // Return appropriate message
        switch (mode) {
            case "playlist":
                return "🔁 Set loop mode to **entire playlist**.";
            case "single":
                return "🔂 Set loop mode to **this track** only.";
            case "no":
                return "▶️ Loop mode **disabled**.";
        }
    }
}
