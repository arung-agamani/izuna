import type { VoiceBasedChannel } from "discord.js";
import type { Player } from "shoukaku";
import { PlayerState, PlayerStateMachine } from "../lib/ongaku/PlayerState";
import { getShoukakuContext, requireShoukakuContext } from "./ShoukakuContext";

type PlayerEndReason = "finished" | "loadFailed" | "stopped" | "replaced" | "cleanup" | string;

export interface PlayerManagerOptions {
    /** How long Lavalink should keep the session resumable, in seconds. */
    resumeTimeoutSec?: number;
}

export class PlayerManager {
    private readonly players: Map<string, Player> = new Map();
    private readonly stateMachines: Map<string, PlayerStateMachine> = new Map();
    private readonly options: Required<PlayerManagerOptions>;

    public constructor(options?: PlayerManagerOptions) {
        this.options = {
            resumeTimeoutSec: options?.resumeTimeoutSec ?? 300,
        };
    }

    public getStateMachine(guildId: string): PlayerStateMachine {
        let sm = this.stateMachines.get(guildId);
        if (!sm) {
            sm = new PlayerStateMachine();
            this.stateMachines.set(guildId, sm);
        }
        return sm;
    }

    public getPlayer(guildId: string): Player | undefined {
        return this.players.get(guildId);
    }

    public async getOrCreatePlayer(guildId: string, voiceChannel: VoiceBasedChannel): Promise<Player> {
        const existing = this.players.get(guildId);
        if (existing) return existing;

        const shoukakuManager = requireShoukakuContext();

        const shardId = (voiceChannel as any).guild?.shardId ?? 0;
        const player = await shoukakuManager.joinVoiceChannel({
            guildId,
            channelId: voiceChannel.id,
            shardId,
        });

        // Enable session resuming on Lavalink. Safe to ignore failures here.
        try {
            await player.node.rest.updateSession(true, this.options.resumeTimeoutSec);
        } catch {
            // Intentionally ignore: older Lavalink versions / permission issues can fail this call.
        }

        this.setupEventHandlers(player, guildId);
        this.players.set(guildId, player);
        return player;
    }

    public async destroyPlayer(guildId: string): Promise<void> {
        const player = this.players.get(guildId);
        const sm = this.stateMachines.get(guildId);

        // Mark as destroyed first; Lavalink events may still arrive after teardown.
        sm?.tryTransitionTo(PlayerState.DESTROYED, { allowSameState: true });

        if (player) {
            try {
                (player as any).removeAllListeners?.();
            } catch {
                // ignore
            }
        }

        const shoukakuManager = getShoukakuContext();
        if (shoukakuManager) {
            try {
                await shoukakuManager.leaveVoiceChannel(guildId);
            } catch {
                // ignore
            }
        }

        this.players.delete(guildId);
        this.stateMachines.delete(guildId);
    }

    public setupEventHandlers(player: Player, guildId: string): void {
        const sm = this.getStateMachine(guildId);

        // Defensive: avoid duplicated handlers if called twice.
        try {
            (player as any).removeAllListeners?.("end");
            (player as any).removeAllListeners?.("exception");
            (player as any).removeAllListeners?.("stuck");
            (player as any).removeAllListeners?.("closed");
            (player as any).removeAllListeners?.("start");
        } catch {
            // ignore
        }

        (player as any).on?.("start", () => {
            // trackStart
            sm.tryTransitionTo(PlayerState.PLAYING, { allowSameState: true });
        });

        (player as any).on?.("exception", () => {
            // trackException: Lavalink may continue, but many bots treat this as a stop->next.
            sm.tryTransitionTo(PlayerState.STOPPED, { allowSameState: true });
        });

        (player as any).on?.("stuck", () => {
            // trackStuck
            sm.tryTransitionTo(PlayerState.STOPPED, { allowSameState: true });
        });

        (player as any).on?.("closed", () => {
            // websocketClosed / voice connection closed
            sm.tryTransitionTo(PlayerState.DESTROYED, { allowSameState: true });
        });

        (player as any).on?.("end", (data: { reason?: PlayerEndReason } | undefined) => {
            const reason = data?.reason;
            if (reason === "replaced") {
                // Track was replaced by another start; keep flow moving.
                sm.tryTransitionTo(PlayerState.LOADING, { allowSameState: true });
                return;
            }

            // For finished/stopped/cleanup/loadFailed, Lavalink player has no current track.
            sm.tryTransitionTo(PlayerState.STOPPED, { allowSameState: true });
        });
    }
}
