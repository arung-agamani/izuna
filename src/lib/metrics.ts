import { Counter, Gauge, Histogram, collectDefaultMetrics, register } from "prom-client";
import { getBotClient } from "./botClient.js";
import { getLavalinkManager } from "../services/LavalinkService.js";
import { MusicService } from "../services/MusicService.js";

// NOTE: this module imports MusicService/LavalinkService and is in turn imported by
// MusicService (for the track counters). The cycle is safe because every cross-reference
// is used lazily — inside method bodies or gauge `collect()` callbacks, never at module
// top level. Do not add top-level uses of these imports.

// Node runtime metrics (CPU, heap, event loop lag, GC) on the default registry.
collectDefaultMetrics();

// Counters
export const commandInvokedTotal = new Counter({
    name: "izuna_command_invoked_total",
    help: "Total Discord command invocations.",
    labelNames: ["command", "source"],
});

export const trackStartedTotal = new Counter({
    name: "izuna_track_started_total",
    help: "Total music tracks started.",
});

export const trackEndedTotal = new Counter({
    name: "izuna_track_ended_total",
    help: "Total music tracks ended.",
    labelNames: ["reason"],
});

export const httpRequestsTotal = new Counter({
    name: "izuna_http_requests_total",
    help: "Total HTTP requests.",
    labelNames: ["method", "route", "status"],
});

export const httpRequestDurationSeconds = new Histogram({
    name: "izuna_http_request_duration_seconds",
    help: "HTTP request duration in seconds.",
    labelNames: ["method", "route", "status"],
    buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
});

// Gauges — computed lazily at scrape time via collect(), so no timers and no stale values.

export const botReady = new Gauge({
    name: "izuna_bot_ready",
    help: "1 if the Discord bot is ready, 0 otherwise.",
    collect() {
        this.set(getBotClient()?.isReady() ? 1 : 0);
    },
});

export const botGuildCount = new Gauge({
    name: "izuna_bot_guild_count",
    help: "Number of guilds the bot is connected to.",
    collect() {
        this.set(getBotClient()?.guilds.cache.size ?? 0);
    },
});

export const botUserCount = new Gauge({
    name: "izuna_bot_user_count",
    help: "Estimated unique users across all guilds (sum of memberCount).",
    collect() {
        const client = getBotClient();
        this.set(client ? client.guilds.cache.reduce((sum, g) => sum + g.memberCount, 0) : 0);
    },
});

export const botWsPingMs = new Gauge({
    name: "izuna_bot_ws_ping_ms",
    help: "Discord gateway websocket heartbeat ping in milliseconds.",
    collect() {
        this.set(getBotClient()?.ws.ping ?? 0);
    },
});

export const botUptimeSeconds = new Gauge({
    name: "izuna_bot_uptime_seconds",
    help: "Bot uptime in seconds.",
    collect() {
        this.set((getBotClient()?.uptime ?? 0) / 1000);
    },
});

export const musicActiveSessions = new Gauge({
    name: "izuna_music_active_sessions",
    help: "Number of active music sessions.",
    collect() {
        this.set(MusicService.getSessions().size);
    },
});

export const lavalinkNodes = new Gauge({
    name: "izuna_lavalink_nodes",
    help: "Number of registered Lavalink nodes.",
    collect() {
        this.set(getLavalinkManager()?.nodes.size ?? 0);
    },
});

export { register };
