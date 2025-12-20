import type { VoiceBasedChannel } from "discord.js";
import type { Player } from "shoukaku";
import { getShoukakuContext, requireShoukakuContext } from "./ShoukakuContext";

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
        const shardId = (voiceChannel as any).guild?.shardId ?? 0;

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
                // ignore
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
            (player as any).stopTrack?.();
        } catch {
            // ignore
        }

        try {
            // Remove ALL listeners
            (player as any).removeAllListeners?.();
            // Also explicitly remove each event type to be thorough
            (player as any).off?.("start");
            (player as any).off?.("end");
            (player as any).off?.("exception");
            (player as any).off?.("stuck");
            (player as any).off?.("closed");
        } catch {
            // ignore
        }

        try {
            (player as any).destroy?.();
        } catch {
            // ignore
        }
    }
}
