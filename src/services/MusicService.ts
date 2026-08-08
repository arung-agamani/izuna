import type { VoiceBasedChannel, TextBasedChannel, Guild } from "discord.js";
import { LoadType, type Track, type Player } from "shoukaku";
import { PlayerState } from "../lib/ongaku/PlayerState";
import { PlayerManager } from "./PlayerManager";
import { resolveLavalinkNode } from "./ShoukakuContext";
import { parseUrl, getLavalinkQuery, type ParsedUrl } from "../lib/urlParser";
import logger, { logError, getErrorMessage } from "../lib/winston"

export type LavalinkLoadType = "TRACK_LOADED" | "PLAYLIST_LOADED" | "SEARCH_RESULT" | "NO_MATCHES" | "LOAD_FAILED";

export interface MusicSession {
    guildId: string;
    voiceChannelId: string;
    player: Player;
    queue: Track[];
    currentPosition: number;
    repeatMode: "no" | "single" | "playlist";
    isPaused: boolean;
    isPlaying: boolean;
    textChannel?: TextBasedChannel;
}

function shoukakuLoadTypeToString(loadType: LoadType): LavalinkLoadType {
    switch (loadType) {
        case LoadType.EMPTY:
            return "NO_MATCHES";
        case LoadType.ERROR:
            return "LOAD_FAILED";
        case LoadType.PLAYLIST:
            return "PLAYLIST_LOADED";
        case LoadType.SEARCH:
            return "SEARCH_RESULT";
        case LoadType.TRACK:
            return "TRACK_LOADED";
        default:
            return "LOAD_FAILED";
    }
}

type LavalinkResolveResult = {
    loadType: LavalinkLoadType | string;
    data?: unknown;
    tracks?: unknown;
    playlistInfo?: unknown;
};

export class MusicService {
    private static instance: MusicService | null = null;
    private static sessions: Map<string, MusicSession> = new Map();

    private readonly playerManager: PlayerManager;

    private constructor(playerManager?: PlayerManager) {
        this.playerManager = playerManager ?? new PlayerManager();
    }

    /**
     * Get the singleton instance of MusicService
     * @param playerManager - Optional PlayerManager instance (only used on first initialization)
     */
    public static getInstance(playerManager?: PlayerManager): MusicService {
        if (!MusicService.instance) {
            MusicService.instance = new MusicService(playerManager);
        }
        return MusicService.instance;
    }

    /**
     * Get all active sessions (useful for diagnostics and cleanup)
     */
    public static getSessions(): ReadonlyMap<string, MusicSession> {
        return MusicService.sessions;
    }

    /**
     * Clear all sessions (useful for testing and bot shutdown)
     */
    public static clearAllSessions(): void {
        MusicService.sessions.clear();
    }

    public getSession(guildId: string): MusicSession | undefined {
        return MusicService.sessions.get(guildId);
    }

    /**
     * Get or create a music session for a guild
     *
     * CRITICAL FIXES IMPLEMENTED:
     * - Issue #1: Cleans up old player before replacing to prevent event handler accumulation
     * - Issue #5: Re-attaches event handlers to new player instance after rejoin
     *
     * @param guildId - The guild ID
     * @param voiceChannel - The voice channel to join
     * @param textChannel - Optional text channel for user feedback
     * @returns The session (existing or newly created)
     */
    public async getOrCreateSession(guildId: string, voiceChannel: VoiceBasedChannel, textChannel?: TextBasedChannel): Promise<MusicSession> {
        const existing = MusicService.sessions.get(guildId);
        if (existing) {
            // Update textChannel if provided (allows commands to provide context for messaging)
            if (textChannel) {
                existing.textChannel = textChannel;
            }

            // Check if we're already in the correct voice channel
            if (existing.voiceChannelId === voiceChannel.id) {
                // Already in the right channel, no need to rejoin
                logger.debug(`Session already exists in voice channel ${voiceChannel.id}, skipping rejoin`);
                return existing;
            }

            // Different voice channel - need to move
            logger.debug(`Moving from voice channel ${existing.voiceChannelId} to ${voiceChannel.id}`);
            try {
                // Clean up old player before replacing to prevent memory leaks
                this.playerManager.cleanupPlayer(existing.player);

                const player = await this.playerManager.joinVoiceChannel(guildId, voiceChannel);
                existing.player = player;
                existing.voiceChannelId = voiceChannel.id;

                // Re-attach event handlers to new player
                this.attachSessionEventHandlers(existing);

                if (textChannel?.isSendable()) await textChannel.send(`✅ Moved to voice channel: **${voiceChannel.name}**`);
            } catch (error) {
                logError("Error during voice channel move:", error);
                if (textChannel?.isSendable()) await textChannel.send("❌ Failed to move voice channels. Please try stopping and starting again.");
            }
            return existing;
        }

        // Join voice channel - MUST AWAIT before proceeding
        const player = await this.playerManager.joinVoiceChannel(guildId, voiceChannel);
        if (textChannel?.isSendable()) await textChannel.send(`✅ Joined voice channel: **${voiceChannel.name}**`);

        const session: MusicSession = {
            guildId,
            voiceChannelId: voiceChannel.id,
            player,
            queue: [],
            currentPosition: 0,
            repeatMode: "no",
            isPaused: false,
            isPlaying: false,
            textChannel,
        };
        MusicService.sessions.set(guildId, session);

        // Attach session-level event handlers ONCE per session
        this.attachSessionEventHandlers(session);

        return session;
    }

    /**
     * Attach event handlers to the player for queue progression and user feedback
     * This is called only once when a session is created (and on rejoin)
     *
     * IMPORTANT: Event handlers MUST always fetch the session from the map, never use
     * the captured closure variable to avoid stale references after rejoin.
     */
    private attachSessionEventHandlers(session: MusicSession): void {
        const player = session.player;
        const guildId = session.guildId;

        // Track exception - provide user feedback
        player.on?.("exception", (err: any) => {
            logError("Player exception:", err);
            // Always get fresh session from map to avoid stale references
            const currentSession = MusicService.sessions.get(guildId);
            if (!currentSession) return;

            if (err.exception?.message === "This video is not available") {
                currentSession.textChannel?.isSendable() && currentSession.textChannel.send("⏭️ Skipping unavailable track").catch(logger.error);
            }
        });

        // Track stuck - provide user feedback
        player.on?.("stuck", () => {
            logger.warn(`Track stuck on guild ${guildId}`);
            // Always get fresh session from map to avoid stale references
            const currentSession = MusicService.sessions.get(guildId);
            if (!currentSession) return;

            currentSession.textChannel?.isSendable() && currentSession.textChannel.send("⏭️ Track stuck, skipping...").catch(logger.error);
        });

        // Track end - handle queue progression
        player.on?.("end", async (data: { reason?: string }) => {
            if (data.reason === "replaced") return; // Track was replaced

            const currentSession = MusicService.sessions.get(guildId);
            if (!currentSession) return;

            const endedTrack = currentSession.queue[currentSession.currentPosition];
            logger.info("track_ended", {
                event: "track_ended",
                guildId,
                trackTitle: endedTrack?.info.title,
                reason: data.reason,
            });

            // Progress queue based on repeat mode
            const currentPosition = currentSession.currentPosition;
            const queueSize = currentSession.queue.length;
            const repeatMode = currentSession.repeatMode;

            // Handle single repeat mode - replay same track
            if (repeatMode === "single") {
                await this.playTrackFromSession(currentSession);
                return;
            }

            // Advance to next track
            currentSession.currentPosition = currentPosition + 1;

            // Check if reached end of queue
            if (currentSession.currentPosition >= queueSize) {
                currentSession.isPlaying = false;
                if (currentSession.textChannel?.isSendable()) await currentSession.textChannel.send("✅ Reached the end of playlist");

                if (repeatMode === "playlist") {
                    currentSession.currentPosition = 0;
                    if (currentSession.textChannel?.isSendable()) await currentSession.textChannel.send("🔄 Playlist loop enabled. Resetting to the beginning.");
                    await this.playTrackFromSession(currentSession);
                }
                return;
            }

            // Play next track
            await this.playTrackFromSession(currentSession);
        });
    }

    /**
     * Play a track from the current session's current position
     * Used internally by event handlers
     */
    private async playTrackFromSession(session: MusicSession): Promise<void> {
        const track = session.queue[session.currentPosition];
        if (!track) return;

        // Skip tracks with null/missing encoded data
        if (!track.encoded) {
            logger.warn(`Track at position ${session.currentPosition} has no encoded data, skipping`);
            session.currentPosition += 1;
            if (session.currentPosition < session.queue.length) {
                await this.playTrackFromSession(session);
            }
            return;
        }

        try {
            await session.player.playTrack({
                track: { encoded: track.encoded },
                position: track.info?.position || 0,
            });
            logger.info("track_started", {
                event: "track_started",
                guildId: session.guildId,
                trackTitle: track.info.title,
                durationMs: track.info.length,
            });

            const fancyTimeFormat = (seconds: number) => {
                const hours = Math.floor(seconds / 3600);
                const minutes = Math.floor((seconds % 3600) / 60);
                const secs = Math.floor(seconds % 60);
                if (hours > 0) return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
                return `${minutes}:${secs.toString().padStart(2, "0")}`;
            };

            const duration = fancyTimeFormat(track.info.length / 1000);
            const position = track.info.position ? fancyTimeFormat(track.info.position / 1000) : "0:00";

            if (session.textChannel?.isSendable()) await session.textChannel.send(`▶️ **${track.info.title}** | ${duration}${position !== "0:00" ? ` (seek: ${position})` : ""}`);
        } catch (error) {
            logError("Error playing track:", error);
            session.textChannel?.isSendable() && session.textChannel.send("❌ Failed to play track. Skipping...").catch(logger.error);
        }
    }

    /**
     * Public method for commands to start playing the next track from the queue
     * @param guildId - Guild ID
     */
    public async playNextTrackForGuild(guildId: string): Promise<void> {
        const session = MusicService.sessions.get(guildId);
        if (!session) {
            logger.warn(`No session found for guild ${guildId} when trying to play next track`);
            return;
        }
        if (!session.player) {
            logger.warn(`No player found in session for guild ${guildId}`);
            return;
        }
        logger.debug(`Playing next track for guild ${guildId} (queue size: ${session.queue.length}, position: ${session.currentPosition})`);
        await this.playTrackFromSession(session);
    }

    /**
     * Resolve a query via Lavalink REST.
     * This mirrors what `play.ts` does today, but is meant to become the single entry point.
     */
    public async resolveTrack(query: string): Promise<LavalinkResolveResult> {
        const lavalinkNode = resolveLavalinkNode();

        const res = (await lavalinkNode.rest.resolve(query)) as any;
        if (res && res.loadType) res.loadType = shoukakuLoadTypeToString(res.loadType);
        return res as LavalinkResolveResult;
    }

    public async queueTrack(guildId: string, track: Track) {
        const session = MusicService.sessions.get(guildId);
        if (!session) throw new Error("No active music session for this guild");
        session.queue.push(track);
    }

    /**
     * Play the next track in the legacy queue, if possible.
     * This is intentionally conservative so it doesn't disrupt existing flow.
     */
    public async playNext(guildId: string) {
        const session = MusicService.sessions.get(guildId);
        if (!session) throw new Error("No active music session for this guild");
        if (session.currentPosition >= session.queue.length) {
            return;
        }

        const track = session.queue[session.currentPosition];

        await session.player.playTrack({
            track: { encoded: track.encoded },
            position: (track as any).info?.position,
        } as any);
    }

    public async skipTrack(guildId: string) {
        const session = MusicService.sessions.get(guildId);
        if (!session) throw new Error("No active music session for this guild");

        // stopTrack => trackEnd(reason=STOPPED) on Lavalink.
        await session.player.stopTrack();
    }

    public async pause(guildId: string) {
        const session = MusicService.sessions.get(guildId);
        if (!session) throw new Error("No active music session for this guild");

        const nextPaused = !session.isPaused;
        session.player.setPaused(nextPaused);
        session.isPaused = nextPaused;
        return nextPaused;
    }

    public async destroySession(guildId: string) {
        // Get the session before destroying to clear it
        const session = MusicService.sessions.get(guildId);

        if (session) {
            // Clean up player resources
            this.playerManager.cleanupPlayer(session.player);

            // Clear session's internal state
            session.queue = [];
            session.currentPosition = 0;
            session.isPlaying = false;
            session.isPaused = false;
            session.textChannel = undefined;
        }

        // Actually remove the session from the map to prevent memory leaks
        MusicService.sessions.delete(guildId);

        // Leave voice channel
        await this.playerManager.leaveVoiceChannel(guildId);
    }

    /**
     * Parse a user input string and resolve it through Lavalink
     * Handles YouTube links, playlists, HTTP URLs, and search queries
     *
     * @param input - User input (URL or search query)
     * @param seekMode - Whether to extract timestamp for seeking
     * @returns Resolution result with load type and track data
     */
    public async resolveInput(
        input: string,
        seekMode: boolean = false,
    ): Promise<{
        parsed: ParsedUrl;
        result: LavalinkResolveResult;
        timestamp?: number;
    }> {
        const parsed = parseUrl(input, seekMode);
        const lavalinkQuery = getLavalinkQuery(parsed);

        // Special handling for Google Drive - needs additional processing
        if (parsed.type === "google-drive") {
            throw new Error("Google Drive support requires additional setup. Please use YouTube links or search queries.");
        }

        const result = await this.resolveTrack(lavalinkQuery);

        return {
            parsed,
            result,
            timestamp: parsed.type === "youtube-video" ? parsed.timestamp : undefined,
        };
    }

    /**
     * Queue tracks from a resolution result
     * Handles different load types (single track, playlist, search result, etc.)
     *
     * @param guildId - Guild ID
     * @param result - The Lavalink resolution result
     * @param timestamp - Optional timestamp to set on the track (in milliseconds)
     * @returns Array of queued tracks
     */
    public async queueTracksFromResult(guildId: string, result: LavalinkResolveResult, timestamp?: number): Promise<Track[]> {
        const session = MusicService.sessions.get(guildId);
        if (!session) throw new Error("No active music session for this guild");

        const queuedTracks: Track[] = [];

        // Check if playlist has ended (position is at or past the end)
        const playlistEnded = !session.isPlaying && session.currentPosition >= session.queue.length;

        switch (result.loadType) {
            case "TRACK_LOADED": {
                const track = result.data as Track;
                if (!track.encoded) {
                    logger.warn(`Track has no encoded data: ${track.info?.title}`);
                    break;
                }
                if (timestamp) {
                    track.info.position = timestamp;
                }
                session.queue.push(track);
                queuedTracks.push(track);
                break;
            }

            case "PLAYLIST_LOADED": {
                const tracks = (result.data as any).tracks || [];
                const validTracks = tracks.filter((t: Track) => {
                    if (!t.encoded) {
                        logger.warn(`Skipping track with no encoded data: ${t.info?.title}`);
                        return false;
                    }
                    return true;
                });
                session.queue.push(...validTracks);
                queuedTracks.push(...validTracks);
                break;
            }

            case "SEARCH_RESULT": {
                const tracks = (result.data as any[]) || [];
                if (tracks.length > 0) {
                    const track = tracks[0];
                    if (!track.encoded) {
                        logger.warn(`Search result track has no encoded data: ${track.info?.title}`);
                        break;
                    }
                    session.queue.push(track);
                    queuedTracks.push(track);
                }
                break;
            }

            case "NO_MATCHES":
            case "LOAD_FAILED":
            default:
                // No tracks to queue
                break;
        }

        // If playlist had ended and we just added new tracks, reset position to the first new track
        if (playlistEnded && queuedTracks.length > 0) {
            const firstNewTrackIndex = session.queue.length - queuedTracks.length;
            session.currentPosition = firstNewTrackIndex;
            logger.debug(`Playlist had ended, reset position to ${firstNewTrackIndex} to play newly added tracks`);
        }

        return queuedTracks;
    }

    /**
     * Get information about what's currently playing
     * @param guildId - Guild ID
     * @returns Current track info or null if nothing playing
     */
    public getCurrentTrack(guildId: string): Track | null {
        const session = MusicService.sessions.get(guildId);
        if (!session || session.currentPosition >= session.queue.length) {
            return null;
        }

        return session.queue[session.currentPosition] as Track | null;
    }

    /**
     * Get the queue for a guild
     * @param guildId - Guild ID
     * @returns Array of tracks in queue
     */
    public getQueue(guildId: string): Track[] {
        const session = MusicService.sessions.get(guildId);
        return session?.queue ?? [];
    }

    /**
     * Get queue statistics
     * @param guildId - Guild ID
     * @returns Queue statistics (size, current position, etc.)
     */
    public getQueueStats(guildId: string) {
        const session = MusicService.sessions.get(guildId);
        if (!session) {
            return null;
        }

        return {
            queueSize: session.queue.length,
            currentPosition: session.currentPosition,
            isPlaying: session.isPlaying,
            repeatMode: session.repeatMode,
            isPaused: session.isPaused,
        };
    }

    /**
     * Set repeat/loop mode for a guild
     * @param guildId - Guild ID
     * @param mode - Repeat mode: "no", "single", or "playlist"
     */
    public setRepeatMode(guildId: string, mode: "no" | "single" | "playlist"): void {
        const session = MusicService.sessions.get(guildId);
        if (!session) throw new Error("No active music session for this guild");
        session.repeatMode = mode;
    }

    /**
     * Jump to a specific track in the queue
     * Sets the position to play the track after current one ends
     * @param guildId - Guild ID
     * @param position - Track position (0-based index)
     * @returns The track that will be played next
     */
    public jumpToTrack(guildId: string, position: number): Track | null {
        const session = MusicService.sessions.get(guildId);
        if (!session) throw new Error("No active music session for this guild");

        if (position < 0 || position >= session.queue.length) {
            throw new Error(`Invalid position: ${position}. Queue size: ${session.queue.length}`);
        }

        // Set position to the target track - 1 so it plays next
        session.currentPosition = position - 1;
        return session.queue[position] || null;
    }

    /**
     * Jump to a track and start playing immediately
     * @param guildId - Guild ID
     * @param position - Track position (0-based index)
     */
    public async jumpAndPlay(guildId: string, position: number): Promise<void> {
        const session = MusicService.sessions.get(guildId);
        if (!session) throw new Error("No active music session for this guild");

        if (position < 0 || position >= session.queue.length) {
            throw new Error(`Invalid position: ${position}. Queue size: ${session.queue.length}`);
        }

        session.currentPosition = position;
        await this.playTrackFromSession(session);
    }

    /**
     * Move a track from one position to another in the queue
     * @param guildId - Guild ID
     * @param fromPosition - Source position (0-based index)
     * @param toPosition - Destination position (0-based index)
     * @returns The moved track
     */
    public moveTrack(guildId: string, fromPosition: number, toPosition: number): Track {
        const session = MusicService.sessions.get(guildId);
        if (!session) throw new Error("No active music session for this guild");

        if (fromPosition < 0 || fromPosition >= session.queue.length) {
            throw new Error(`Invalid from position: ${fromPosition}. Queue size: ${session.queue.length}`);
        }

        if (toPosition < 0 || toPosition >= session.queue.length) {
            throw new Error(`Invalid to position: ${toPosition}. Queue size: ${session.queue.length}`);
        }

        // Remove from source position
        const [movedTrack] = session.queue.splice(fromPosition, 1);

        // Insert at destination position
        session.queue.splice(toPosition, 0, movedTrack);

        return movedTrack;
    }

    /**
     * Remove a track from the queue
     * @param guildId - Guild ID
     * @param position - Track position (0-based index)
     * @returns The removed track
     */
    public removeTrack(guildId: string, position: number): Track {
        const session = MusicService.sessions.get(guildId);
        if (!session) throw new Error("No active music session for this guild");

        if (position < 0 || position >= session.queue.length) {
            throw new Error(`Invalid position: ${position}. Queue size: ${session.queue.length}`);
        }

        // Don't allow removing currently playing track
        if (session.isPlaying && session.currentPosition === position) {
            throw new Error("Cannot remove currently playing track. Use skip command instead.");
        }

        const [removedTrack] = session.queue.splice(position, 1);

        // Adjust current position if needed
        if (position < session.currentPosition) {
            session.currentPosition--;
        }

        return removedTrack;
    }

    /**
     * Shuffle the queue using Fisher-Yates algorithm
     * Preserves currently playing track at its position
     * @param guildId - Guild ID
     */
    public shuffleQueue(guildId: string): void {
        const session = MusicService.sessions.get(guildId);
        if (!session) throw new Error("No active music session for this guild");

        if (session.queue.length <= 1) {
            throw new Error("Queue must have at least 2 tracks to shuffle");
        }

        // If something is playing, preserve the current track and shuffle the rest
        if (session.isPlaying) {
            const currentTrack = session.queue[session.currentPosition];
            const beforeCurrent = session.queue.slice(0, session.currentPosition);
            const afterCurrent = session.queue.slice(session.currentPosition + 1);

            // Shuffle tracks after current position using Fisher-Yates
            for (let i = afterCurrent.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [afterCurrent[i], afterCurrent[j]] = [afterCurrent[j], afterCurrent[i]];
            }

            // Reconstruct queue
            session.queue = [...beforeCurrent, currentTrack, ...afterCurrent];
        } else {
            // Nothing playing, shuffle entire queue
            const queue = session.queue;
            for (let i = queue.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [queue[i], queue[j]] = [queue[j], queue[i]];
            }
        }
    }

    /**
     * Seek to a specific position in the current track
     * @param guildId - Guild ID
     * @param positionMs - Position in milliseconds
     */
    public async seekTo(guildId: string, positionMs: number): Promise<void> {
        const session = MusicService.sessions.get(guildId);
        if (!session) throw new Error("No active music session for this guild");
        if (!session.isPlaying) throw new Error("No track currently playing");

        const currentTrack = session.queue[session.currentPosition];
        if (!currentTrack) throw new Error("No track at current position");

        // Check if track has a length (live streams don't)
        if (currentTrack.info.length && positionMs > currentTrack.info.length) {
            throw new Error(`Seek position (${positionMs}ms) exceeds track length (${currentTrack.info.length}ms)`);
        }

        if (positionMs < 0) {
            throw new Error("Seek position must be positive");
        }

        await session.player.seekTo(positionMs);
    }

    /**
     * Move the bot to a different voice channel
     * @param guildId - Guild ID
     * @param newVoiceChannel - The new voice channel to join
     * @param guild - Discord guild object (needed for bot member lookup)
     * @throws Error if bot lacks permissions or move fails
     */
    public async moveToChannel(guildId: string, newVoiceChannel: VoiceBasedChannel, guild: Guild): Promise<void> {
        const session = MusicService.sessions.get(guildId);
        if (!session) throw new Error("No active music session for this guild");

        logger.debug(`[MusicService] moveToChannel called for guild ${guildId}`);
        logger.debug(`[MusicService] Target channel: ${newVoiceChannel.name} (${newVoiceChannel.id})`);

        // Get bot member
        const botMember = guild.members.cache.get(guild.client.user!.id);
        if (!botMember) {
            logger.error(`[MusicService] Bot member not found in guild ${guildId}`);
            throw new Error("Bot member not found in guild");
        }

        logger.debug(`[MusicService] Bot member found: ${botMember.user.tag}`);
        logger.debug(`[MusicService] Current voice channel: ${botMember.voice.channel?.name || "none"}`);

        // Check bot permissions
        const permissions = newVoiceChannel.permissionsFor(botMember);
        logger.debug(`[MusicService] Bot permissions in target channel:`);
        logger.debug(`  - CONNECT: ${permissions?.has("Connect")}`);
        logger.debug(`  - SPEAK: ${permissions?.has("Speak")}`);
        logger.debug(`  - VIEW_CHANNEL: ${permissions?.has("ViewChannel")}`);
        logger.debug(`  - MOVE_MEMBERS: ${permissions?.has("MoveMembers")}`);

        const missingPermissions = permissions?.missing(["Connect", "Speak", "ViewChannel"]) || [];
        logger.debug(`  - Missing basic permissions: ${missingPermissions.join(", ") || "none"}`);

        // Check if channel is full
        if (newVoiceChannel.userLimit > 0 && newVoiceChannel.members.size >= newVoiceChannel.userLimit) {
            logger.warn(`[MusicService] Target channel is full (${newVoiceChannel.members.size}/${newVoiceChannel.userLimit})`);
            const canBypassLimit = permissions?.has("MoveMembers");
            logger.debug(`[MusicService] Can bypass user limit: ${canBypassLimit}`);
        }

        try {
            logger.debug(`[MusicService] Attempting to move bot to channel ${newVoiceChannel.name}...`);

            // Attempt to move (atomic operation - only update session on success)
            await botMember.voice.setChannel(newVoiceChannel);

            // Only update session after successful move
            session.voiceChannelId = newVoiceChannel.id;

            logger.info(`[MusicService] Successfully moved bot to channel ${newVoiceChannel.name}`);
        } catch (error: any) {
            logError(`[MusicService] Failed to move bot to channel:`, error);

            // Handle DiscordAPIError[50013] - Missing Permissions
            if (error?.code === 50013 || error?.message?.includes("Missing Permissions")) {
                logger.error(`[MusicService] Permission denied - Bot lacks required permissions`);

                // Provide helpful error message
                const hasMoveMembers = permissions?.has("MoveMembers");
                const isChannelFull = newVoiceChannel.userLimit > 0 && newVoiceChannel.members.size >= newVoiceChannel.userLimit;

                let errorMessage = "❌ Insufficient permissions to move to that voice channel.\n\n";

                if (!hasMoveMembers && isChannelFull) {
                    errorMessage += `The channel is full (${newVoiceChannel.members.size}/${newVoiceChannel.userLimit}) and I lack the **Move Members** permission.\n`;
                    errorMessage += "Please ask a server admin to grant me the **Move Members** permission, or free up space in the channel.";
                } else if (!hasMoveMembers) {
                    errorMessage += "I need the **Move Members** permission to switch voice channels.\n";
                    errorMessage += "Please ask a server admin to grant this permission in Server Settings → Roles.";
                } else if (missingPermissions.length > 0) {
                    errorMessage += `Missing permissions: **${missingPermissions.join(", ")}**\n`;
                    errorMessage += "Please ask a server admin to grant these permissions for the target channel.";
                } else {
                    errorMessage += "Please ask a server admin to check my permissions for that voice channel.";
                }

                throw new Error(errorMessage);
            }

            // Re-throw other errors with context
            if (error instanceof Error) {
                logger.error(`[MusicService] Error message: ${error.message}`);
                logger.error(`[MusicService] Error name: ${error.name}`);
                throw new Error(`Failed to move to voice channel: ${error.message}`);
            }

            throw new Error("Failed to move to voice channel: Unknown error");
        }
    }

    /**
     * Clear the entire queue
     * @param guildId - Guild ID
     * @param keepCurrent - If true, keeps the currently playing track
     */
    public clearQueue(guildId: string, keepCurrent: boolean = true): void {
        const session = MusicService.sessions.get(guildId);
        if (!session) throw new Error("No active music session for this guild");

        if (keepCurrent && session.isPlaying) {
            const currentTrack = session.queue[session.currentPosition];
            session.queue = [currentTrack];
            session.currentPosition = 0;
        } else {
            session.queue = [];
            session.currentPosition = 0;
            session.isPlaying = false;
        }
    }
}
