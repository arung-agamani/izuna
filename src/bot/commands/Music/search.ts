import { Args, Command } from "@sapphire/framework";
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, type Message } from "discord.js";
import musicManager from "../../../lib/musicQueue";
import logger from "../../../lib/winston";
// import prisma from "../../lib/prisma";
const ytsearch = require("youtube-search-api");

export class SearchMusicCommand extends Command {
    public constructor(context: Command.Context, options: Command.Options) {
        super(context, {
            ...options,
            name: "search",
            description: "Search for music to play before enqueuing",
        });
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
        // const musicGuildInfo = musicManager.get(message.guildId!);
        // if (!musicGuildInfo) {
        //     await message.channel.send("No bot in voice channel. Are you okay?");
        //     return;
        // }
        try {
            // get user input query
            const query = await args.rest("string");
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
                        .setCustomId(`ytplay:${message.author.id}:${result.items[i].id}`)
                        .setStyle(ButtonStyle.Primary)
                );
            }
            row2.addComponents(new ButtonBuilder().setLabel("X").setCustomId(`ytplay:${message.author.id}:CANCELATIONAWOO`).setStyle(ButtonStyle.Danger));
            embed.setTitle("Izuna Search Result");
            embed.setDescription(msg);

            await message.channel.send({ embeds: [embed], components: [row, row2] });
        } catch (error) {
            console.log(error);
            await message.channel.send("Error on command. Put search term");
            return;
        }
    }
}
