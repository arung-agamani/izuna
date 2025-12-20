import { Command } from "@sapphire/framework";
import { Message, EmbedBuilder, Colors } from "discord.js";
import { validateMusicCommandPrerequisites } from "../../../lib/voiceValidation";
import { MusicService } from "../../../services/MusicService";
import { fancyTimeFormat } from "../../../lib/utils";
import logger from "../../../lib/winston";

/**
 * Now Playing 2 Command - Advanced Debugging & State Display
 *
 * Shows COMPREHENSIVE state information from:
 * 1. MusicService internal state (sessions, queue, repeat mode, etc.)
 * 2. Player state (position, volume, etc.)
 * 3. Lavalink player info (filters, equalizer, etc.)
 * 4. Currently playing track details
 * 5. Queue information
 *
 * Useful for debugging and understanding the current state.
 */
export class NowPlaying2MusicCommand extends Command {
    private musicService: MusicService;

    public constructor(context: Command.Context, options: Command.Options) {
        super(context, {
            ...options,
            name: "nowplaying2",
            aliases: ["np2", "debug-np", "np-debug"],
            description: "Show comprehensive now playing state (debug view)",
            detailedDescription: `Show detailed state information including:
- Current track info
- Queue status
- Internal bot state
- Lavalink player state
- All flags and settings`,
        });

        this.musicService = new MusicService();
    }

    public override async messageRun(message: Message) {
        // Validate prerequisites
        const validation = validateMusicCommandPrerequisites({
            guildId: message.guildId,
            guild: message.guild,
            textChannel: message.channel,
            member: message.member,
            botId: message.client.id!,
        });

        if (!validation.valid) {
            await message.channel.send(validation.error!);
            return;
        }

        const guildId = message.guildId!;

        try {
            // Get session from MusicService
            const session = this.musicService.getSession(guildId);

            if (!session) {
                await message.channel.send("❌ No active music session in this guild");
                return;
            }

            // Get queue stats
            const stats = this.musicService.getQueueStats(guildId);
            const currentTrack = this.musicService.getCurrentTrack(guildId);
            const queue = this.musicService.getQueue(guildId);

            // Create comprehensive state display
            const embeds = this.buildStateEmbeds(session, stats, currentTrack, queue, guildId);

            // Send embeds
            if (embeds.length === 1) {
                await message.channel.send({ embeds });
            } else {
                // Split into chunks if too long
                for (const embed of embeds) {
                    await message.channel.send({ embeds: [embed] });
                }
            }
        } catch (error) {
            logger.error("Error in nowplaying2 command:", error);
            await message.channel.send(`❌ Error: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
    }

    /**
     * Build comprehensive state embed displays
     */
    private buildStateEmbeds(session: any, stats: any, currentTrack: any, queue: any[], guildId: string) {
        const embeds: EmbedBuilder[] = [];

        // Embed 1: Current Track
        embeds.push(this.buildCurrentTrackEmbed(currentTrack, session));

        // Embed 2: Queue Information
        embeds.push(this.buildQueueInfoEmbed(queue, stats));

        // Embed 3: Internal Bot State
        embeds.push(this.buildInternalStateEmbed(session, stats));

        // Embed 4: Player State (Lavalink)
        embeds.push(this.buildPlayerStateEmbed(session));

        // Embed 5: Debugging Info
        embeds.push(this.buildDebugInfoEmbed(session, guildId));

        return embeds;
    }

    /**
     * Build current track information embed
     */
    private buildCurrentTrackEmbed(currentTrack: any, session: any): EmbedBuilder {
        const embed = new EmbedBuilder().setTitle("🎵 Currently Playing").setColor(Colors.Purple);

        if (!currentTrack) {
            embed.addFields({ name: "Status", value: "❌ No track playing" });
            return embed;
        }

        // Track info
        embed.addFields({
            name: "Title",
            value: currentTrack.info.title || "Unknown",
        });

        embed.addFields({
            name: "Artist",
            value: currentTrack.info.author || "Unknown",
        });

        // Duration info
        const duration = fancyTimeFormat(currentTrack.info.length / 1000);
        const position = fancyTimeFormat(session.player.position / 1000);
        const progress = this.buildProgressBar(session.player.position, currentTrack.info.length);

        embed.addFields({
            name: "Progress",
            value: `${progress} ${position} / ${duration}`,
            inline: false,
        });

        // Track metadata
        embed.addFields({
            name: "Source",
            value: currentTrack.info.sourceName || "Unknown",
            inline: true,
        });

        embed.addFields({
            name: "URI",
            value: `[Link](${currentTrack.info.uri || "N/A"})`,
            inline: true,
        });

        // Seek position if set
        if (currentTrack.info.position && currentTrack.info.position > 0) {
            embed.addFields({
                name: "Seek Position",
                value: fancyTimeFormat(currentTrack.info.position / 1000),
                inline: true,
            });
        }

        return embed;
    }

    /**
     * Build queue information embed
     */
    private buildQueueInfoEmbed(queue: any[], stats: any): EmbedBuilder {
        const embed = new EmbedBuilder().setTitle("📋 Queue Information").setColor(Colors.Blue);

        if (!stats) {
            embed.addFields({ name: "Status", value: "❌ No queue stats available" });
            return embed;
        }

        embed.addFields({
            name: "Queue Size",
            value: `${stats.currentPosition + 1} / ${stats.queueSize}`,
            inline: true,
        });

        embed.addFields({
            name: "Remaining Tracks",
            value: `${Math.max(0, stats.queueSize - stats.currentPosition - 1)}`,
            inline: true,
        });

        // Calculate total playlist duration
        if (queue && queue.length > 0) {
            const totalDuration = queue.reduce((sum, track) => sum + (track.info?.length || 0), 0) / 1000;
            const remainingDuration = queue.slice(stats.currentPosition).reduce((sum, track) => sum + (track.info?.length || 0), 0) / 1000;

            embed.addFields({
                name: "Total Playlist Duration",
                value: fancyTimeFormat(totalDuration),
                inline: true,
            });

            embed.addFields({
                name: "Remaining Duration",
                value: fancyTimeFormat(remainingDuration),
                inline: true,
            });
        }

        // Next 5 tracks preview
        if (queue && queue.length > stats.currentPosition + 1) {
            let nextTracksPreview = "";
            const endIdx = Math.min(stats.currentPosition + 6, queue.length);

            for (let i = stats.currentPosition + 1; i < endIdx; i++) {
                const track = queue[i];
                const duration = fancyTimeFormat((track?.info?.length || 0) / 1000);
                nextTracksPreview += `\`${i + 1}.\` ${track?.info?.title || "Unknown"} (${duration})\n`;
            }

            if (nextTracksPreview) {
                embed.addFields({
                    name: "Next Tracks Preview",
                    value: nextTracksPreview || "None",
                    inline: false,
                });
            }
        }

        return embed;
    }

    /**
     * Build internal bot state embed
     */
    private buildInternalStateEmbed(session: any, stats: any): EmbedBuilder {
        const embed = new EmbedBuilder().setTitle("🤖 Internal Bot State").setColor(Colors.Green);

        if (!stats) {
            embed.addFields({ name: "Status", value: "❌ No session available" });
            return embed;
        }

        // Playing state
        embed.addFields({
            name: "Is Playing",
            value: stats.isPlaying ? "✅ Yes" : "❌ No",
            inline: true,
        });

        embed.addFields({
            name: "Is Paused",
            value: stats.isPaused ? "✅ Yes" : "❌ No",
            inline: true,
        });

        // Repeat mode
        const repeatEmoji = {
            no: "🔀",
            single: "🔁",
            playlist: "🔄",
        };

        embed.addFields({
            name: "Repeat Mode",
            value: `${repeatEmoji[stats.repeatMode as keyof typeof repeatEmoji]} ${stats.repeatMode.toUpperCase()}`,
            inline: true,
        });

        // Session info
        embed.addFields({
            name: "Guild ID",
            value: session.guildId,
            inline: true,
        });

        embed.addFields({
            name: "Voice Channel ID",
            value: session.voiceChannelId,
            inline: true,
        });

        embed.addFields({
            name: "Current Position",
            value: `${stats.currentPosition + 1}/${stats.queueSize}`,
            inline: true,
        });

        return embed;
    }

    /**
     * Build Lavalink player state embed
     */
    private buildPlayerStateEmbed(session: any): EmbedBuilder {
        const embed = new EmbedBuilder().setTitle("🎮 Lavalink Player State").setColor(Colors.Red);

        const player = session.player;

        if (!player) {
            embed.addFields({ name: "Status", value: "❌ No player available" });
            return embed;
        }

        // Player basic info
        embed.addFields({
            name: "Player State",
            value: player.state || "UNKNOWN",
            inline: true,
        });

        embed.addFields({
            name: "Position (ms)",
            value: `${player.position || 0}`,
            inline: true,
        });

        embed.addFields({
            name: "Volume",
            value: `${player.volume || 100}%`,
            inline: true,
        });

        // Player flags
        const flags: string[] = [];

        if (player.paused) flags.push("Paused");
        if (player.equalizer && player.equalizer.length > 0) flags.push("Equalizer Active");
        if (player.karaoke) flags.push("Karaoke");
        if (player.timescale) flags.push("Timescale");
        if (player.tremolo) flags.push("Tremolo");
        if (player.vibrato) flags.push("Vibrato");
        if (player.rotation) flags.push("Rotation");
        if (player.distortion) flags.push("Distortion");
        if (player.channelMix) flags.push("Channel Mix");
        if (player.lowPass) flags.push("Low Pass");

        if (flags.length > 0) {
            embed.addFields({
                name: "Active Filters/Effects",
                value: flags.join(", "),
                inline: false,
            });
        } else {
            embed.addFields({
                name: "Active Filters/Effects",
                value: "None",
                inline: false,
            });
        }

        // Node info
        if (player.node) {
            embed.addFields({
                name: "Lavalink Node",
                value: player.node.info?.name || "Unknown",
                inline: true,
            });

            embed.addFields({
                name: "Node Version",
                value: player.node.info?.version?.semver || "Unknown",
                inline: true,
            });
        }

        return embed;
    }

    /**
     * Build debugging information embed
     */
    private buildDebugInfoEmbed(session: any, guildId: string): EmbedBuilder {
        const embed = new EmbedBuilder().setTitle("🔧 Debug Information").setColor(Colors.Orange);

        // Session object info
        embed.addFields({
            name: "Session Type",
            value: "MusicSession (from MusicService)",
            inline: true,
        });

        embed.addFields({
            name: "Has Player",
            value: session.player ? "✅ Yes" : "❌ No",
            inline: true,
        });

        embed.addFields({
            name: "Queue Array Length",
            value: `${session.queue?.length || 0}`,
            inline: true,
        });

        // Inspect player object
        if (session.player) {
            const playerKeys = Object.keys(session.player).join(", ");
            embed.addFields({
                name: "Player Properties Available",
                value: playerKeys.substring(0, 1024) || "None",
                inline: false,
            });
        }

        // Quick state check
        embed.addFields({
            name: "State Consistency Check",
            value: this.performStateConsistencyCheck(session),
            inline: false,
        });

        return embed;
    }

    /**
     * Build a visual progress bar
     */
    private buildProgressBar(position: number, length: number, barLength: number = 20): string {
        const percentage = (position / length) * 100;
        const filledLength = Math.round((barLength * position) / length);
        const emptyLength = barLength - filledLength;

        const filled = "█".repeat(filledLength);
        const empty = "░".repeat(emptyLength);

        return `[${filled}${empty}] ${Math.round(percentage)}%`;
    }

    /**
     * Perform consistency check on state
     */
    private performStateConsistencyCheck(session: any): string {
        const checks: string[] = [];

        // Check 1: Queue size vs current position
        if (session.currentPosition >= session.queue.length) {
            checks.push("⚠️ Current position >= queue length");
        } else {
            checks.push("✅ Current position within bounds");
        }

        // Check 2: Repeat mode validity
        const validRepeatModes = ["no", "single", "playlist"];
        if (!validRepeatModes.includes(session.repeatMode)) {
            checks.push(`⚠️ Invalid repeat mode: ${session.repeatMode}`);
        } else {
            checks.push(`✅ Repeat mode valid: ${session.repeatMode}`);
        }

        // Check 3: Player position vs track length
        if (session.queue[session.currentPosition]) {
            const currentTrack = session.queue[session.currentPosition];
            if (session.player.position > currentTrack.info.length) {
                checks.push("⚠️ Player position > current track length");
            } else {
                checks.push("✅ Player position valid");
            }
        }

        // Check 4: Guild and channel IDs
        if (!session.guildId || !session.voiceChannelId) {
            checks.push("⚠️ Missing guild or channel ID");
        } else {
            checks.push("✅ Guild and channel IDs present");
        }

        return checks.join("\n");
    }
}
