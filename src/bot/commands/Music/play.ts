import { Args, ChatInputCommand, Command } from "@sapphire/framework";
import type { Message, TextBasedChannel, VoiceBasedChannel } from "discord.js";
import { fancyTimeFormat } from "../../../lib/utils.js";
import logger, { logError } from "../../../lib/winston.js";
import { validateMusicCommandPrerequisites } from "../../../lib/voiceValidation.js";
import { MusicService } from "../../../services/MusicService.js";

/**
 * Play Music Command (Refactored)
 *
 * This is a fully refactored version of the original play command that:
 * 1. Uses MusicService for track resolution and queue management
 * 2. Uses URL parsing utilities for consistent URL handling
 * 3. Uses validation utilities to eliminate duplicated checks
 * 4. Separates concerns: validation, parsing, resolving, queuing
 *
 * Migration Status: COMPLETE (full service-layer implementation)
 * - No longer uses legacy musicManager
 * - All functionality delegated to MusicService
 * - Cleaner architecture with proper separation of concerns
 */
export class PlayMusicCommand extends Command {
    private musicService: MusicService;

    public constructor(context: Command.Context, options: Command.Options) {
        super(context, {
            ...options,
            name: "play",
            flags: ["s", "seek"],
            description: "Plays music from YouTube or search query",
            detailedDescription: `Play music using a search query (like YouTube search) or a direct YouTube link.
Currently supports:
- YouTube videos (https://youtube.com/watch?v=...)
- YouTube playlists (https://youtube.com/playlist?list=...)
- Search queries (title, artist, etc.)

Use --seek or -s flag to jump to a specific timestamp if available.`,
        });

        this.musicService = MusicService.getInstance();
    }

    public override registerApplicationCommands(registry: ChatInputCommand.Registry) {
        registry.registerChatInputCommand(
            (builder) => {
                builder
                    .setName("play")
                    .setDescription("Play music from YouTube links or search query")
                    .addStringOption((opt) => opt.setName("query").setDescription("Enter search query or link").setRequired(true))
                    .addBooleanOption((opt) => opt.setName("seek").setDescription("Seek to timestamp if available").setRequired(false));
            },
            // {
            //     idHints: ["1176094847669637171", "1176133402689273958"],
            // }
        );
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
            await interaction.reply(validation.error!);
            return;
        }

        const query = interaction.options.getString("query", true);
        const isSeeking = interaction.options.getBoolean("seek", false) || false;

        await interaction.deferReply();

        try {
            await this.play({
                textChannel: interaction.channel as TextBasedChannel,
                voiceChannel: validation.voiceChannel!,
                guildId: interaction.guildId!,
                authorId: interaction.user.id,
                query,
                isSeeking,
            });

            await interaction.followUp({
                content: "✅ Track added to queue!",
                ephemeral: true,
            });
        } catch (error) {
            logError("Error in play command:", error);
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

        const isSeeking = args.getFlags("s", "seek");
        const query = await args.rest("string");

        if (!query) {
            if (message.channel.isSendable()) await message.channel.send("Please provide a search query or URL");
            return;
        }

        try {
            await this.play({
                textChannel: message.channel,
                voiceChannel: validation.voiceChannel!,
                guildId: message.guildId!,
                authorId: message.author.id,
                query,
                isSeeking,
            });
        } catch (error) {
            logError("Error in play command:", error);
            if (message.channel.isSendable()) await message.channel.send(`❌ Error: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
    }

    /**
     * Main play logic
     * Handles: parsing input → resolving tracks → queuing → playing
     */
    private async play(options: {
        textChannel: TextBasedChannel;
        voiceChannel: VoiceBasedChannel;
        guildId: string;
        authorId: string;
        query: string;
        isSeeking: boolean;
    }): Promise<void> {
        const { textChannel, voiceChannel, guildId, query, isSeeking } = options;

        // Parse the input URL/query
        let resolution;
        try {
            resolution = await this.musicService.resolveInput(query, isSeeking, guildId);
        } catch (error) {
            throw new Error(error instanceof Error ? error.message : "Failed to resolve input", { cause: error });
        }

        const { parsed, result, timestamp } = resolution;

        logger.debug(`Parsed input type: ${parsed.type}`);
        logger.debug(`Resolution result: ${result.loadType}`);

        // Handle resolution errors
        if ((result.loadType as string) === "NO_MATCHES" || (result.loadType as string) === "LOAD_FAILED") {
            const errorMsg = result.loadType === "NO_MATCHES" ? "No results found for that query" : "Failed to load the track/playlist";
            throw new Error(errorMsg);
        }

        // Get or create music session via MusicService
        // Pass textChannel so session handlers can send user feedback
        const musicSession = await this.musicService.getOrCreateSession(guildId, voiceChannel, textChannel);

        // Ensure textChannel is set on the session (important for user feedback from event handlers)
        if (musicSession) {
            musicSession.textChannel = textChannel;
        }

        // CRITICAL: Ensure player is fully ready before queueing
        // Give the player a moment to establish voice connection
        if (!musicSession.player) {
            throw new Error("Failed to create player - bot could not join voice channel");
        }

        // Queue the tracks
        try {
            const queuedTracks = await this.musicService.queueTracksFromResult(guildId, result, timestamp);

            if (queuedTracks.length === 0) {
                throw new Error("No tracks were queued from the result");
            }

            // Format response message
            this.sendQueueMessage(textChannel, parsed, result, queuedTracks);

            // Start playing if not already playing
            const stats = this.musicService.getQueueStats(guildId);
            // send the stats as message
            if (textChannel.isSendable()) textChannel.send(`🎶 Queue Size: ${stats?.queueSize}, Currently Playing: ${stats?.isPlaying ? "Yes" : "No"}`).catch(logger.error);

            // Play if not currently playing OR if queue was ended but now has new tracks
            if (
                (stats && !stats.isPlaying && stats.queueSize > 0) ||
                (stats && stats.currentPosition >= stats.queueSize - queuedTracks.length && stats.queueSize > 0)
            ) {
                logger.debug(`Starting playback for guild ${guildId} (queue size: ${stats.queueSize}, position: ${stats.currentPosition})`);
                // Use MusicService's internal playback method
                await this.musicService.playNextTrackForGuild(guildId);
            }
        } catch (error) {
            logError("Error queuing tracks:", error);
            throw new Error("Failed to queue tracks", { cause: error });
        }
    }

    /**
     * Send a formatted queue confirmation message
     */
    private sendQueueMessage(textChannel: TextBasedChannel, parsed: any, result: any, queuedTracks: any[]): void {
        const trackCount = queuedTracks.length;
        if (!textChannel.isSendable()) return;

        switch (parsed.type) {
            case "youtube-video": {
                const track = queuedTracks[0];
                const duration = fancyTimeFormat((track?.info?.length || 0) / 1000);
                const position = track?.info?.position ? fancyTimeFormat(track.info.position / 1000) : "0:00";

                textChannel.send(`⬇️ Track loaded: **${track?.info?.title}** | ${duration}${position !== "0:00" ? ` (seek: ${position})` : ""}`);
                break;
            }

            case "youtube-playlist": {
                textChannel.send(`📋 Playlist loaded: **${trackCount}** tracks added to queue`);
                break;
            }

            case "search": {
                const track = queuedTracks[0];
                const duration = fancyTimeFormat((track?.info?.length || 0) / 1000);

                textChannel.send(`🔍 Search result: **${track?.info?.title}** | ${duration} (from query: "${parsed.query}")`);
                break;
            }

            case "http": {
                const track = queuedTracks[0];
                const duration = fancyTimeFormat((track?.info?.length || 0) / 1000);

                textChannel.send(`🔗 URL loaded: **${track?.info?.title}** | ${duration}`);
                break;
            }
        }
    }
}
