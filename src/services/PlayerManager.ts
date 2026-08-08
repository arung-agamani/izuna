import type { VoiceBasedChannel } from "discord.js";
import type { Player } from "shoukaku";
import { getShoukakuContext, requireShoukakuContext } from "./ShoukakuContext";
import logger, { logError } from "../lib/winston"

/**
 * PlayerManager - Utility for low-level Shoukaku player operations
 *
 * This is now a stateless utility. All state management is done in MusicService.
 * This class only handles:
 * - Joining voice channels
 * - Leaving voice channels
 * - Cleanup of player resources
 */
export class PlayerManager {
    /**
     * Join a voice channel and return the player
     * State management is handled by caller (MusicService)
     */
    public async joinVoiceChannel(guildId: string, voiceChannel: VoiceBasedChannel): Promise<Player> {
        const shoukakuManager = requireShoukakuContext();
        const shardId = (voiceChannel as unknown as { guild?: { shardId: number } }).guild?.shardId ?? 0;

        const player = await shoukakuManager.joinVoiceChannel({
            guildId,
            channelId: voiceChannel.id,
            shardId,
        });

        return player;
    }

    /**
     * Leave a voice channel for a guild
     */
    public async leaveVoiceChannel(guildId: string): Promise<void> {
        const shoukakuManager = getShoukakuContext();
        if (shoukakuManager) {
            try {
                await shoukakuManager.leaveVoiceChannel(guildId);
            } catch {
                logger.debug("leaveVoiceChannel failed", { guildId });
            }
        }
    }

    /**
     * Clean up a player - remove listeners and destroy if possible
     */
    public cleanupPlayer(player: Player): void {
        if (!player) return;

        try {
            // Stop any playing track first
            (player as unknown as { stopTrack?: () => void }).stopTrack?.();
        } catch {
            logger.debug("cleanupPlayer: stopTrack failed");
        }

        try {
            // Remove ALL listeners
            (player as unknown as { removeAllListeners?: () => void }).removeAllListeners?.();
            // Also explicitly remove each event type to be thorough
            (player as unknown as { off?: (event: string) => void }).off?.("start");
            (player as unknown as { off?: (event: string) => void }).off?.("end");
            (player as unknown as { off?: (event: string) => void }).off?.("exception");
            (player as unknown as { off?: (event: string) => void }).off?.("stuck");
            (player as unknown as { off?: (event: string) => void }).off?.("closed");
        } catch {
            logger.debug("cleanupPlayer: removeAllListeners failed");
        }

        try {
            (player as unknown as { destroy?: () => void }).destroy?.();
        } catch {
            logger.debug("cleanupPlayer: destroy failed");
        }
    }
}
