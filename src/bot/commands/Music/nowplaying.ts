import { Args, Command } from "@sapphire/framework";
import { Message, EmbedBuilder, Colors, ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import { validateMusicCommandPrerequisites } from "../../../lib/voiceValidation";
import { MusicService } from "../../../services/MusicService";
import { fancyTimeFormat } from "../../../lib/utils";
import logger from "../../../lib/winston";

/**
 * Now Playing 2 Command - User-Friendly Now Playing Display
 *
 * Shows:
 * 1. Currently playing track with thumbnail and link
 * 2. Full playlist with pagination (5 items per page)
 * 3. Playback controls and repeat mode
 *
 * Clean, user-friendly interface for viewing playlist status.
 */
export class NowPlayingMusicCommand extends Command {
    private musicService: MusicService;

    public constructor(context: Command.Context, options: Command.Options) {
        super(context, {
            ...options,
            name: "nowplaying",
            aliases: ["np", "queue", "q"],
            description: "Show now playing and playlist",
            detailedDescription: `Show currently playing track and full playlist with:
- Track thumbnail and source link
- Full playlist with pagination
- Duration for each track
- Playback status and repeat mode`,
        });

        this.musicService = MusicService.getInstance();
    }

    public override async messageRun(message: Message, args: Args) {
        // Validate prerequisites
        const validation = validateMusicCommandPrerequisites({
            guildId: message.guildId,
            guild: message.guild,
            textChannel: message.channel,
            member: message.member,
            botId: message.client.id!,
        });

        if (!validation.valid) {
            if (message.channel.isSendable()) await message.channel.send(validation.error!);
            return;
        }

        const guildId = message.guildId!;

        try {
            // Parse page number if provided
            let page = 1;
            try {
                const pageArg = await args.pick("integer");
                page = Math.max(1, pageArg);
            } catch {
                // No page argument provided, default to page 1
            }

            // Get session from MusicService
            const session = this.musicService.getSession(guildId);

            if (!session) {
                if (message.channel.isSendable()) await message.channel.send("❌ No active music session. Use `play2` to start playing music.");
                return;
            }

            // Get queue stats
            const stats = this.musicService.getQueueStats(guildId);
            const currentTrack = this.musicService.getCurrentTrack(guildId);
            const queue = this.musicService.getQueue(guildId);

            // Build and send embed
            const embed = this.buildPlaylistEmbed(session, stats, currentTrack, queue, page);
            const components = this.buildNavigationButtons(queue.length, page, message.author.id);

            if (components.length > 0) {
                if (message.channel.isSendable()) await message.channel.send({ embeds: [embed], components });
            } else {
                if (message.channel.isSendable()) await message.channel.send({ embeds: [embed] });
            }
        } catch (error) {
            logger.error("Error in nowplaying2 command:", error);
            if (message.channel.isSendable()) await message.channel.send(`❌ Error: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
    }

    /**
     * Build playlist embed with current track and queue
     */
    private buildPlaylistEmbed(session: any, stats: any, currentTrack: any, queue: any[], page: number): EmbedBuilder {
        const embed = new EmbedBuilder().setColor(Colors.Purple);

        // Calculate pagination
        const itemsPerPage = 5;
        const totalPages = Math.ceil(queue.length / itemsPerPage);
        const currentPage = Math.min(page, totalPages);
        const startIdx = (currentPage - 1) * itemsPerPage;
        const endIdx = Math.min(startIdx + itemsPerPage, queue.length);

        // Header with repeat mode
        const repeatEmoji = {
            no: "▶️",
            single: "🔂",
            playlist: "🔁",
        };
        const repeatMode = stats?.repeatMode || "no";
        embed.setTitle(`${repeatEmoji[repeatMode as keyof typeof repeatEmoji]} Now Playing & Playlist`);

        // Currently Playing Section
        if (currentTrack && stats?.isPlaying) {
            const duration = fancyTimeFormat(currentTrack.info.length / 1000);
            const position = fancyTimeFormat((session.player?.position || 0) / 1000);
            const progress = this.buildProgressBar(session.player?.position || 0, currentTrack.info.length);

            let nowPlayingText = `**${currentTrack.info.title}**\n`;
            nowPlayingText += `*by ${currentTrack.info.author || "Unknown Artist"}*\n\n`;
            nowPlayingText += `${progress} \`${position}\` / \`${duration}\`\n`;

            // Add source link
            if (currentTrack.info.uri) {
                nowPlayingText += `🔗 [View Source](${currentTrack.info.uri})\n`;
            }

            // Add source name
            if (currentTrack.info.sourceName) {
                nowPlayingText += `📍 Source: ${currentTrack.info.sourceName}`;
            }

            embed.addFields({
                name: "🎵 Now Playing",
                value: nowPlayingText,
                inline: false,
            });

            // Set thumbnail if available
            if (currentTrack.info.artworkUrl) {
                embed.setThumbnail(currentTrack.info.artworkUrl);
            }
        } else {
            embed.addFields({
                name: "🎵 Now Playing",
                value: stats?.isPaused ? "⏸️ **Paused**" : "❌ Nothing playing",
                inline: false,
            });
        }

        // Playlist Section
        if (queue.length === 0) {
            embed.addFields({
                name: "📋 Playlist",
                value: "Empty playlist. Add tracks with `play2`!",
                inline: false,
            });
        } else {
            // Build playlist text
            let playlistText = "";
            for (let i = startIdx; i < endIdx; i++) {
                const track = queue[i];
                const duration = fancyTimeFormat((track.info?.length || 0) / 1000);
                const isCurrentTrack = i === stats?.currentPosition;
                const prefix = isCurrentTrack ? "▶️" : `\`${i + 1}.\``;

                playlistText += `${prefix} **${track.info?.title || "Unknown"}** \`[${duration}]\`\n`;
            }

            // Calculate total duration
            const totalDuration = queue.reduce((sum, track) => sum + (track.info?.length || 0), 0) / 1000;
            const remainingDuration = queue.slice(stats?.currentPosition || 0).reduce((sum, track) => sum + (track.info?.length || 0), 0) / 1000;

            embed.addFields({
                name: `📋 Playlist (Page ${currentPage}/${totalPages})`,
                value: playlistText || "No tracks",
                inline: false,
            });

            // Footer with stats
            let footerText = `${queue.length} track${queue.length !== 1 ? "s" : ""} • Total: ${fancyTimeFormat(totalDuration)}`;
            if (stats?.isPlaying) {
                footerText += ` • Remaining: ${fancyTimeFormat(remainingDuration)}`;
            }
            footerText += ` • Repeat: ${repeatMode.toUpperCase()}`;

            embed.setFooter({ text: footerText });
        }

        return embed;
    }

    /**
     * Build navigation buttons for pagination
     */
    private buildNavigationButtons(queueLength: number, currentPage: number, userId: string): ActionRowBuilder<ButtonBuilder>[] {
        const itemsPerPage = 5;
        const totalPages = Math.ceil(queueLength / itemsPerPage);

        if (totalPages <= 1) {
            return []; // No pagination needed
        }

        const row = new ActionRowBuilder<ButtonBuilder>();

        // Previous button
        row.addComponents(
            new ButtonBuilder()
                .setCustomId(`np2:${userId}:prev:${currentPage}`)
                .setLabel("◀ Previous")
                .setStyle(ButtonStyle.Primary)
                .setDisabled(currentPage <= 1),
        );

        // Page indicator
        row.addComponents(
            new ButtonBuilder()
                .setCustomId(`np2:${userId}:page:${currentPage}`)
                .setLabel(`${currentPage} / ${totalPages}`)
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(true),
        );

        // Next button
        row.addComponents(
            new ButtonBuilder()
                .setCustomId(`np2:${userId}:next:${currentPage}`)
                .setLabel("Next ▶")
                .setStyle(ButtonStyle.Primary)
                .setDisabled(currentPage >= totalPages),
        );

        return [row];
    }

    /**
     * Build a visual progress bar
     */
    private buildProgressBar(position: number, length: number, barLength: number = 20): string {
        if (length === 0) return "[░░░░░░░░░░░░░░░░░░░░] 0%";

        const percentage = Math.min(100, (position / length) * 100);
        const filledLength = Math.round((barLength * position) / length);
        const emptyLength = barLength - filledLength;

        const filled = "█".repeat(Math.max(0, filledLength));
        const empty = "░".repeat(Math.max(0, emptyLength));

        return `[${filled}${empty}] ${Math.round(percentage)}%`;
    }
}
