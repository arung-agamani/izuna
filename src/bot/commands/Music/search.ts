import { Args, ChatInputCommand, Command } from "@sapphire/framework";
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, TextBasedChannel, type Message } from "discord.js";
import logger from "../../../lib/winston";
const ytsearch = require("youtube-search-api");

export class SearchMusicCommand extends Command {
    public constructor(context: Command.Context, options: Command.Options) {
        super(context, {
            ...options,
            name: "search",
            description: "Search for music to play before enqueuing",
        });
    }

    public override registerApplicationCommands(registry: ChatInputCommand.Registry) {
        registry.registerChatInputCommand(
            (builder) => {
                builder
                    .setName("search")
                    .setDescription("Search music from Youtube with given query")
                    .addStringOption((opt) => opt.setName("query").setDescription("Enter search query").setRequired(true));
            },
            {
                idHints: [],
            }
        );
    }

    public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
        if (!interaction.guildId) {
            await interaction.channel?.send("this comman");
        }
        const textChannel = interaction.channel;
        if (!textChannel) {
            await interaction.channel!.send("Text channel is undefined. This issue has been reported (should be)");
            return;
        }
        const voiceChannel = interaction.guild?.members.cache.get(interaction.member!.user.id)?.voice.channel;
        if (!voiceChannel) {
            await interaction.channel?.send("You must be in voice channel first.");
            return;
        }
        const query = interaction.options.getString("query", true);
        const authorId = interaction.user.id;
        await interaction.deferReply();
        await this.search(query, authorId, textChannel);
        await interaction.followUp({ content: "Search command complete!", ephemeral: true });
    }

    public override async messageRun(message: Message, args: Args) {
        if (!message.guildId) {
            await message.channel.send("This command only works in servers");
            return;
        }
        if (!message.member?.voice.channel) {
            await message.channel.send("You must be in voice channel first.");
            return;
        }
        const query = await args.rest("string");
        const authorId = message.author.id;
        const textChannel = message.channel;
        await this.search(query, authorId, textChannel);
    }

    public async search(query: string, authorId: string, textChannel: TextBasedChannel) {
        try {
            // search query
            logger.debug(query);
            const result = await ytsearch.GetListByKeyword(query, false, 5, [{ type: "video" }]);
            // show result as an interaction
            const embed = new EmbedBuilder();
            const row = new ActionRowBuilder<ButtonBuilder>();
            const row2 = new ActionRowBuilder<ButtonBuilder>();
            let msg = "";
            for (let i = 0; i < result.items.length; i++) {
                msg += `${i + 1}. ${result.items[i].title}.\n`;
                row.addComponents(
                    new ButtonBuilder()
                        .setLabel(String(i + 1))
                        .setCustomId(`ytplay:${authorId}:${result.items[i].id}`)
                        .setStyle(ButtonStyle.Primary)
                );
            }
            row2.addComponents(new ButtonBuilder().setLabel("X").setCustomId(`ytplay:${authorId}:CANCELATIONAWOO`).setStyle(ButtonStyle.Danger));
            embed.setTitle("Izuna Search Result");
            embed.setDescription(msg);

            await textChannel.send({ embeds: [embed], components: [row, row2] });
        } catch (error) {
            console.log(error);
            await textChannel.send("Error on command. Put search term");
            return;
        }
    }
}
