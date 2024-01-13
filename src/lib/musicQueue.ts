import type { VoiceBasedChannel } from "discord.js";
import { LoadType, Player, Shoukaku, Track } from "shoukaku";
import prisma from "./prisma";

export function shoukakuLoadType2String(loadType: LoadType) {
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
    }
}

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
    stopIssued: boolean;
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

// export function saveMusicManagerState(manager: Map<string, MusicGuildInfo>) {
//     manager.forEach(async (val, key) => {
//         await prisma.playerSession.upsert({
//             where: {
//                 guildId: val.voiceChannel.guildId,
//                 sessionId: val.player.connection.sessionId,
//             },
//             create: {
//                 guildId: val.voiceChannel.guildId,
//                 sessionId: val.player.connection.sessionId,
//                 resumeKey: "",
//             },
//             update: {
//                 guildId: val.voiceChannel.guildId,
//                 sessionId: val.player.connection.sessionId,
//                 resumeKey: "",
//             },
//         });
//     });
// }
export default manager;
