export enum PlayerState {
    IDLE = "IDLE",
    LOADING = "LOADING",
    PLAYING = "PLAYING",
    PAUSED = "PAUSED",
    /**
     * Player exists but has no active track.
     * In Lavalink terms this is usually: no track on the player ("stopped"), but the voice session may still be alive.
     */
    STOPPED = "STOPPED",
    /**
     * Player/connection torn down (e.g. left voice, node disconnected, player destroyed).
     * After this, most Lavalink operations are invalid until a new player/session is created.
     */
    DESTROYED = "DESTROYED",
}

export class PlayerStateMachine {
    private state: PlayerState = PlayerState.IDLE;

    public getState(): PlayerState {
        return this.state;
    }

    canTransitionTo(newState: PlayerState): boolean {
        const validTransitions: Record<PlayerState, PlayerState[]> = {
            // IDLE: no track queued/playing yet, but session may exist.
            [PlayerState.IDLE]: [PlayerState.LOADING, PlayerState.STOPPED, PlayerState.DESTROYED],

            // LOADING: resolving/starting a track. Lavalink can still be paused or stopped during this window.
            [PlayerState.LOADING]: [PlayerState.PLAYING, PlayerState.PAUSED, PlayerState.STOPPED, PlayerState.IDLE, PlayerState.DESTROYED],

            // PLAYING: trackStart received / actively playing.
            // Allow PLAYING -> LOADING for "replace"/skip-to-next flows where you immediately start another track.
            [PlayerState.PLAYING]: [PlayerState.PAUSED, PlayerState.STOPPED, PlayerState.IDLE, PlayerState.LOADING, PlayerState.DESTROYED],

            // PAUSED: paused=true on Lavalink player; can resume or replace/stop.
            [PlayerState.PAUSED]: [PlayerState.PLAYING, PlayerState.LOADING, PlayerState.STOPPED, PlayerState.IDLE, PlayerState.DESTROYED],

            // STOPPED: explicit stop/end-of-queue. In Lavalink this often equals "no current track".
            [PlayerState.STOPPED]: [PlayerState.IDLE, PlayerState.LOADING, PlayerState.DESTROYED],

            // DESTROYED: terminal for this session.
            [PlayerState.DESTROYED]: [],
        };

        return validTransitions[this.state].includes(newState);
    }

    /**
     * Strict transition; throws on invalid transitions.
     * Consider using tryTransitionTo() when wiring to async Lavalink events to avoid crashes on races.
     */
    transitionTo(newState: PlayerState, opts?: { allowSameState?: boolean }): void {
        if (opts?.allowSameState && newState === this.state) return;

        if (!this.canTransitionTo(newState)) {
            throw new Error(`Invalid state transition from ${this.state} to ${newState}`);
        }

        this.state = newState;
    }

    /**
     * Safe transition; returns false instead of throwing.
     * Useful for Lavalink/Shoukaku event handlers where order can race (trackEnd vs destroy, etc.).
     */
    tryTransitionTo(newState: PlayerState, opts?: { allowSameState?: boolean }): boolean {
        if (opts?.allowSameState && newState === this.state) return true;
        if (!this.canTransitionTo(newState)) return false;
        this.state = newState;
        return true;
    }
}
