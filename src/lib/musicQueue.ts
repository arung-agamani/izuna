import type { VoiceBasedChannel } from "discord.js";
import type { Player, Shoukaku, Track } from "shoukaku";

export interface MusicGuildInfo {
    initiator: string;
    voiceChannel: VoiceBasedChannel;
    currentPosition: number;
    queue: Track[];
    isRepeat: "no" | "single" | "playlist";
    isPlaying: boolean;
    player: Player;
}

export interface MusicQueueItem {
    name: string;
    duration: number;
    source_url: string;
    lavalink_hash: string;
}

const manager = new Map<string, MusicGuildInfo>();
export let shoukakuManager: Shoukaku | undefined = undefined;

export function getShoukakuManager() {
    return shoukakuManager;
}

export function setShoukakuManager(manager: Shoukaku) {
    shoukakuManager = manager;
}

export default manager;
