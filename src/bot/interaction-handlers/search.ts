import { InteractionHandler, InteractionHandlerTypes, PieceContext } from "@sapphire/framework";
import { ButtonInteraction } from "discord.js";
import logger from "../../lib/winston";
import { MusicService } from "../../services/MusicService";
import { fancyTimeFormat } from "../../lib/utils";
import { Track } from "shoukaku";

/**
 * Search Interaction Handler (Refactored)
 *
 * Handles button interactions from the search2 command.
 * Queues the selected track from YouTube search results.
 *
 * Migration Status: COMPLETE (uses MusicService)
 */
export class SearchInteractionHandler extends InteractionHandler {
    private musicService: MusicService;

    public constructor(ctx: PieceContext, options: InteractionHandler.Options) {
        super(ctx, {
            ...options,
            interactionHandlerType: InteractionHandlerTypes.Button,
        });

        this.musicService = MusicService.getInstance();
    }

    public async run(interaction: ButtonInteraction, parsedData: InteractionHandler.ParseResult<this>) {
        logger.debug(`Interaction handler for ${interaction.customId} being handled by SearchInteractionHandler`);
        await interaction.deferUpdate();

        // Handle cancellation
        if (parsedData.ytId === "CANCELATIONAWOO") {
            await interaction.message.edit({ embeds: [], components: [], content: "❌ Search canceled" });
            return;
        }

        // Validate user is still in server
        const member = interaction.guild?.members.cache.get(parsedData.userId);
        if (!member) {
            await interaction.message.edit({
                embeds: [],
                components: [],
                content: "❌ User is no longer in the server",
            });
            return;
        }

        // Validate user is in voice channel
        if (!member.voice.channel) {
            await interaction.message.edit({
                embeds: [],
                components: [],
                content: "❌ You must be in a voice channel to queue tracks",
            });
            return;
        }

        const guildId = interaction.message.guildId!;
        const voiceChannel = member.voice.channel;
        const textChannel = interaction.message.channel;

        try {
            // Get or create session
            const session = await this.musicService.getOrCreateSession(guildId, voiceChannel, textChannel);

            // Resolve the track
            const resolveResult = await this.musicService.resolveTrack(parsedData.ytId);

            if (resolveResult.loadType === "LOAD_FAILED" || resolveResult.loadType === "NO_MATCHES") {
                await interaction.message.edit({
                    embeds: [],
                    components: [],
                    content: "❌ Failed to load the selected track. Please try again.",
                });
                return;
            }

            // Queue the track
            let addedCount = 0;
            if (resolveResult.loadType === "TRACK_LOADED") {
                const track = resolveResult.data as Track;
                await this.musicService.queueTrack(guildId, track);
                addedCount = 1;

                const position = session.queue.length;
                const duration = fancyTimeFormat(track.info.length / 1000);

                await interaction.message.channel.send(`✅ Added to queue: **${track.info.title}** | Duration: ${duration} | Position: ${position}`);
            } else if (resolveResult.loadType === "PLAYLIST_LOADED") {
                // Handle playlist (though search should only return single tracks)
                const queuedTracks = await this.musicService.queueTracksFromResult(guildId, resolveResult);
                addedCount = queuedTracks.length;

                await interaction.message.channel.send(`✅ Added ${addedCount} track(s) from playlist to queue`);
            } else if (resolveResult.loadType === "SEARCH_RESULT") {
                // Queue first result
                const tracks = resolveResult.tracks as Track[];
                if (tracks && tracks.length > 0) {
                    const track = tracks[0];
                    await this.musicService.queueTrack(guildId, track);
                    addedCount = 1;

                    const position = session.queue.length;
                    const duration = fancyTimeFormat(track.info.length / 1000);

                    await interaction.message.channel.send(`✅ Added to queue: **${track.info.title}** | Duration: ${duration} | Position: ${position}`);
                }
            }

            // Start playing if nothing is currently playing
            if (!session.isPlaying && session.queue.length > 0) {
                await this.musicService.playNext(guildId);
                const currentTrack = session.queue[session.currentPosition];
                if (currentTrack) {
                    await interaction.message.channel.send(`🎵 Now playing: **${currentTrack.info.title}**`);
                }
            }

            // Delete the search message after successful selection
            await interaction.message.delete().catch((err) => {
                logger.warn("Failed to delete search message:", err);
            });
        } catch (error) {
            logger.error("Error in search interaction handler:", error);
            await interaction.message.edit({
                embeds: [],
                components: [],
                content: `❌ Error: ${error instanceof Error ? error.message : "Failed to queue track"}`,
            });
        }
    }

    public async parse(interaction: ButtonInteraction) {
        logger.debug(`[search] Received interaction with custom id: ${interaction.customId}`);

        // Handle both old format (ytplay:userId:ytId) and new format
        if (interaction.customId.startsWith("ytplay")) {
            const parts = interaction.customId.split(":");

            if (parts.length >= 3) {
                return this.some({
                    userId: parts[1],
                    ytId: parts[2],
                });
            }
        }

        return this.none();
    }
}
