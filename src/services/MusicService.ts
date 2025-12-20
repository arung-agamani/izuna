import type { VoiceBasedChannel } from "discord.js";
import { LoadType, type Track, type Player } from "shoukaku";
import { PlayerState } from "../lib/ongaku/PlayerState";
import { PlayerManager } from "./PlayerManager";
import { resolveLavalinkNode } from "./ShoukakuContext";

export type LavalinkLoadType = "TRACK_LOADED" | "PLAYLIST_LOADED" | "SEARCH_RESULT" | "NO_MATCHES" | "LOAD_FAILED";

export interface MusicSession {
    guildId: string;
    voiceChannelId: string;
    player: Player;
    queue: Track[];
    currentPosition: number;
    repeatMode: "no" | "single" | "playlist";
    isPaused: boolean;
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
    private readonly playerManager: PlayerManager;
    private readonly sessions: Map<string, MusicSession> = new Map();

    public constructor(playerManager?: PlayerManager) {
        this.playerManager = playerManager ?? new PlayerManager();
    }

    public getSession(guildId: string): MusicSession | undefined {
        return this.sessions.get(guildId);
    }

    public async getOrCreateSession(guildId: string, voiceChannel: VoiceBasedChannel): Promise<MusicSession> {
        const existing = this.sessions.get(guildId);
        if (existing) return existing;

        const player = await this.playerManager.getOrCreatePlayer(guildId, voiceChannel);
        const session: MusicSession = {
            guildId,
            voiceChannelId: voiceChannel.id,
            player,
            queue: [],
            currentPosition: 0,
            repeatMode: "no",
            isPaused: false,
        };
        this.sessions.set(guildId, session);
        return session;
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

    /**
     * Ensure a player exists for guild and voice channel.
     * Does not touch the legacy `musicManager` map unless it already exists.
     */
    public async ensurePlayer(guildId: string, voiceChannel: VoiceBasedChannel) {
        return this.playerManager.getOrCreatePlayer(guildId, voiceChannel);
    }

    public async queueTrack(guildId: string, track: Track) {
        const session = this.sessions.get(guildId);
        if (!session) throw new Error("No active music session for this guild");
        session.queue.push(track);
    }

    /**
     * Play the next track in the legacy queue, if possible.
     * This is intentionally conservative so it doesn't disrupt existing flow.
     */
    public async playNext(guildId: string) {
        const session = this.sessions.get(guildId);
        if (!session) throw new Error("No active music session for this guild");
        if (session.currentPosition >= session.queue.length) {
            return;
        }

        const track = session.queue[session.currentPosition];
        const sm = this.playerManager.getStateMachine(guildId);
        sm.tryTransitionTo(PlayerState.LOADING, { allowSameState: true });

        await session.player.playTrack({
            track: { encoded: track.encoded },
            position: (track as any).info?.position,
        } as any);
    }

    public async skipTrack(guildId: string) {
        const session = this.sessions.get(guildId);
        if (!session) throw new Error("No active music session for this guild");

        // stopTrack => trackEnd(reason=STOPPED) on Lavalink.
        await session.player.stopTrack();
    }

    public async pause(guildId: string) {
        const session = this.sessions.get(guildId);
        if (!session) throw new Error("No active music session for this guild");

        const nextPaused = !session.isPaused;
        session.player.setPaused(nextPaused);
        session.isPaused = nextPaused;
        return nextPaused;
    }

    public async destroySession(guildId: string) {
        await this.playerManager.destroyPlayer(guildId);
        this.sessions.delete(guildId);
    }
}
