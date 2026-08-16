import { Args, ChatInputCommand, Command } from "@sapphire/framework";
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, type Message } from "discord.js";
import ytsearch from "youtube-search-api";
import { MusicService } from "../../../services/MusicService.js";
import logger, { logError } from "../../../lib/winston.js";
/**
 * Search Command (Refactored)
 *
 * Search for music to play before enqueuing.
 * Shows interactive search results with buttons for selection.
 *
 * Migration Status: COMPLETE (full service-layer implementation)
 * Note: This command only displays search results. The actual queuing
 * happens via button interaction handlers (ytplay button handler).
 */
export class SearchCommand extends Command {
    private musicService: MusicService;

    public constructor(context: Command.Context, options: Command.Options) {
        super(context, {
            ...options,
            name: "search",
            aliases: ["find", "s"],
            description: "Search for music to play before enqueuing",
            detailedDescription: `Search music from YouTube with given query.
            Shows top 5 results with interactive buttons to select which track to play.
            Click a number button to queue that track.
            Click X to cancel the search.`,
        });

        this.musicService = MusicService.getInstance();
    }

    public override registerApplicationCommands(registry: ChatInputCommand.Registry) {
        registry.registerChatInputCommand((builder) => {
            builder
                .setName("search")
                .setDescription("Search music from YouTube with given query")
                .addStringOption((opt) => opt.setName("query").setDescription("Enter search query").setRequired(true));
        });
    }

    public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
        // Validate prerequisites (less strict for search - just needs to be in a guild)
        if (!interaction.guildId) {
            await interaction.reply({
                content: "This command only works in servers.",
                ephemeral: true,
            });
            return;
        }

        const query = interaction.options.getString("query", true);
        const authorId = interaction.user.id;

        await interaction.deferReply();

        try {
            await this.performSearch(query, authorId, interaction.channel!);
            await interaction.followUp({ content: "Search complete!", ephemeral: true });
        } catch (error) {
            logError("Error in search command (slash):", error);
            await interaction.followUp({
                content: `Error: ${error instanceof Error ? error.message : "Failed to search"}`,
                ephemeral: true,
            });
        }
    }

    public override async messageRun(message: Message, args: Args) {
        // Validate prerequisites (less strict for search)
        if (!message.guildId || !message.guild) {
            if (message.channel.isSendable()) await message.channel.send("This command only works in servers.");
            return;
        }

        try {
            const query = await args.rest("string");
            const authorId = message.author.id;
            await this.performSearch(query, authorId, message.channel);
        } catch (error: any) {
            if (error.identifier) {
                // Sapphire argument error
                if (message.channel.isSendable()) await message.channel.send("Error: Please provide a search query.");
            } else {
                logError("Error in search command (message):", error);
                if (message.channel.isSendable()) await message.channel.send("Error: Failed to search. Please try again.");
            }
        }
    }

    private async performSearch(query: string, authorId: string, channel: any) {
        try {
            logger.debug(`Searching YouTube for: ${query}`);

            // Search YouTube for videos
            const result = await ytsearch.GetListByKeyword(query, false, 5, [{ type: "video" }]);

            if (!result || !result.items || result.items.length === 0) {
                await channel.send("❌ No results found for your search query.");
                return;
            }

            // Build embed with search results
            const embed = new EmbedBuilder();
            embed.setTitle("🔍 YouTube Search Results");
            embed.setDescription("Click a number to queue that track, or X to cancel.");
            embed.setColor(0x3b82f6); // Blue color

            let resultText = "";
            const row1 = new ActionRowBuilder<ButtonBuilder>();
            const row2 = new ActionRowBuilder<ButtonBuilder>();

            // Add results to embed and create buttons
            for (let i = 0; i < result.items.length && i < 5; i++) {
                const item = result.items[i];
                const duration = item.length?.simpleText || "Unknown";
                resultText += `**${i + 1}.** ${item.title}\n`;
                resultText += `    ⏱️ ${duration} | 👁️ ${item.viewCount || "N/A"}\n\n`;

                row1.addComponents(
                    new ButtonBuilder()
                        .setLabel(String(i + 1))
                        .setCustomId(`ytplay:${authorId}:${item.id}`)
                        .setStyle(ButtonStyle.Primary),
                );
            }

            // Add cancel button
            row2.addComponents(new ButtonBuilder().setLabel("✖ Cancel").setCustomId(`ytplay:${authorId}:CANCELATIONAWOO`).setStyle(ButtonStyle.Danger));

            embed.setDescription(resultText);
            embed.setFooter({ text: "💡 Buttons expire after 5 minutes" });
            embed.setTimestamp();

            await channel.send({
                embeds: [embed],
                components: [row1, row2],
            });
        } catch (error) {
            logError("YouTube search error:", error);
            throw new Error("Failed to search YouTube. Please try again later.", { cause: error });
        }
    }
}
