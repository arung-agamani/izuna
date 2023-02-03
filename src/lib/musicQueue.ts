import type { VoiceBasedChannel } from "discord.js";
import type { Player, Shoukaku, Track } from "shoukaku";

export type LavalinkLoadType = "TRACK_LOADED" | "PLAYLIST_LOADED" | "SEARCH_RESULT" | "NO_MATCHES" | "LOAD_FAILED" | "LAZY_LOAD_GDRIVE";
export interface LavalinkLazyLoad {
    loadType: LavalinkLoadType;
    fileId: string;
    info: {
        title: string;
        length: number;
        uri: string;
    };
}

export interface MusicGuildInfo {
    initiator: string;
    voiceChannel: VoiceBasedChannel;
    currentPosition: number;
    queue: (Track | LavalinkLazyLoad)[];
    isRepeat: "no" | "single" | "playlist";
    isPausing: boolean;
    isPlaying: boolean;
    player: Player;
    isSkippingQueued: boolean;
    skipPosition: number;
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

export function isGdriveLazyLoad(thing: object) {
    if ((thing as LavalinkLazyLoad).fileId) return true;
    return false;
}
export default manager;
