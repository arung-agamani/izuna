import { Command, Args, ChatInputCommand } from "@sapphire/framework";
import { Message, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } from "discord.js";
import axios from "axios";
import * as cheerio from "cheerio";
import { PaginatedMessage } from "@sapphire/discord.js-utilities";
import { Kana, getKanaInstance } from "../../../lib/kana";

export class VNDBCommand extends Command {
    kana: Kana;
    public constructor(context: Command.Context, options: Command.Options) {
        super(context, {
            ...options,
            name: "vn",
            description: "Query info from VNDB.org",
        });
        this.kana = getKanaInstance();
    }

    public override registerApplicationCommands(registry: ChatInputCommand.Registry) {
        registry.registerChatInputCommand(
            (builder) => {
                builder.setName("vn").setDescription("VNDB.org connector");
                builder.addSubcommand((subcommand) =>
                    subcommand
                        .setName("game")
                        .setDescription("Search for full game based on title")
                        .addStringOption((opt) => opt.setName("title").setDescription("Search query").setRequired(true))
                );
                builder.addSubcommand((subcommand) =>
                    subcommand
                        .setName("character")
                        .setDescription("Search for character")
                        .addStringOption((opt) => opt.setName("name").setDescription("Character name").setRequired(true))
                );
            },
            {
                idHints: ["1091502174183358466"],
            }
        );
    }

    public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
        const action = interaction.options.getSubcommand();
        if (action === "game") {
            const title = interaction.options.getString("title", true);
            const searchResult = await this.querySearch(title);
            if (!searchResult) {
                return interaction.reply("Regex Validation Error. Please input just alphanumeric-hiragana-katakana-kanji characters");
            }
            if (typeof searchResult === "string") {
                return interaction.reply(searchResult);
            }
            if (searchResult.results.length > 1) {
                let msg = `Search result returned ${searchResult.results.length} results. Showing up to 5 results\n`;
                const row = new ActionRowBuilder<ButtonBuilder>();
                let i = 1;
                for (const entry of searchResult.results.slice(0, 5)) {
                    msg += `${entry.title} | Popularity: ${entry.popularity} | Rating: ${entry.rating}\n`;
                    const button = new ButtonBuilder();
                    button.setLabel(String(i)).setCustomId(String(entry.id));
                    button.setStyle(ButtonStyle.Primary);
                    row.addComponents(button);
                    i++;
                }
                return interaction.reply({ content: msg, components: [row] });
            } else if (searchResult.results.length === 1) {
                const vnInfo = await this.kana.vn.getInfo(["id", "=", searchResult.results[0].id]);
                if (typeof vnInfo === "string") {
                    return interaction.reply(`Error when fetching entry with id ${searchResult.results[0].id}: ${vnInfo}`);
                }
                const entry = vnInfo.results[0];
                const tags = entry.tags.filter((x: any) => x.spoiler === 0 && x.rating >= 2);

                const embed = new EmbedBuilder();
                embed.setTitle(entry.title);
                embed.setDescription(entry.description || "No data");
                if (entry.image.sexual == 0 && entry.image.violence == 0) embed.setImage(entry.image.url);
                embed.addFields({ name: "Length", value: `${entry.length_minutes / 60} hour(s)`, inline: true });
                embed.addFields({ name: "Popularity", value: entry.popularity !== "" ? String(entry.rating) : "No data", inline: true });
                embed.addFields({ name: "Rating", value: entry.rating !== "" ? String(entry.rating) : "No data", inline: true });
                embed.addFields({
                    name: "Tags (Content)",
                    value: (
                        tags
                            .filter((x: any) => x.category === "cont")
                            .map((x: any) => `\`${x.name}\``)
                            .join(" ") as string
                    ).slice(0, 1023),
                });
                embed.setFooter({ text: `Click the title to open the page` });
                embed.setURL(`https://vndb.org/${entry.id}`);
                // menus
                const infoActionRow = new ActionRowBuilder<ButtonBuilder>();
                infoActionRow.addComponents(
                    new ButtonBuilder()
                        .setLabel("Characters")
                        .setCustomId("info-chara-" + entry.id)
                        .setStyle(ButtonStyle.Secondary)
                );
                return interaction.reply({ embeds: [embed], components: [infoActionRow] });
            } else {
                return interaction.reply("No entries returned for that query");
            }
        } else if (action === "character") {
            const name = interaction.options.getString("name", true);
            const characters = await this.kana.chara.searchCharacter(name);
            if (!characters) return interaction.reply("Error when fetching data");
            if (characters.results.length === 0) {
                return interaction.reply("No character found with given query");
                //         const embed = new EmbedBuilder();
                //         embed.setTitle("Howling Blog").setURL("https://blog.howlingmoon.dev");
                //         embed.setDescription(`Howling Blog is a website created by Closure's author.
                // It contains many good things, ||and also weeb things||.
                // Did you know that Closure's repo is called [izuna](https://github.com/arung-agamani/izuna)?
                // ||It's also a secret that Closure's author has art account over [twitter](https://twitter.com/shirayuk1haruka)||`);
                //         return interaction.reply({
                //             embeds: [embed],
                //         });
            } else if (characters.results.length === 1) {
                const chara = characters.results[0];
                const embed = new EmbedBuilder();
                embed.setTitle(chara.name);
                embed.setDescription(this.censor(chara.description));
                embed.setURL(`https://vndb.org/${chara.id}`);
                chara.vns.forEach((vn) => {
                    embed.addFields({ name: "Appearance(s)", value: vn.title });
                });
                embed.setImage(chara.image.url);
                return interaction.reply({ embeds: [embed] });
            } else {
                const embed = new EmbedBuilder();
                const actionRow = new ActionRowBuilder<StringSelectMenuBuilder>();
                actionRow.addComponents(
                    new StringSelectMenuBuilder()
                        .setCustomId("select")
                        .setPlaceholder("Select character to implore")
                        .addOptions(
                            ...characters.results.map((chara) => ({
                                label: chara.name,
                                description: chara.vns[0].title,
                                value: chara.id,
                            }))
                        )
                );
                embed.setTitle(`Search returned ${characters.results.length} character(s) Only showing top 5 result`);

                return interaction.reply({ embeds: [embed], components: [actionRow] });
            }
        }
    }

    public override async messageRun(message: Message, args: Args) {
        const query = await args.rest("string");
        const searchResult = await this.querySearch(query);
        if (!searchResult) {
            return message.reply("Regex Validation Error. Please input just alphanumeric-hiragana-katakana-kanji characters");
        }
        if (typeof searchResult === "string") {
            return message.reply(searchResult);
        }
        if (searchResult.results.length > 1) {
            let msg = `Search result returned ${searchResult.results.length} results. Showing up to 5 results\n`;
            const row = new ActionRowBuilder<ButtonBuilder>();
            let i = 1;
            for (const entry of searchResult.results.slice(0, 5)) {
                msg += `${entry.title} | Popularity: ${entry.popularity} | Rating: ${entry.rating}\n`;
                const button = new ButtonBuilder();
                button.setLabel(String(i)).setCustomId(String(entry.id));
                button.setStyle(ButtonStyle.Primary);
                row.addComponents(button);
                i++;
            }
            return message.channel.send({ content: msg, components: [row] });
        } else if (searchResult.results.length === 1) {
            const vnInfo = await this.kana.vn.getInfo(["id", "=", searchResult.results[0].id]);
            if (typeof vnInfo === "string") {
                return message.reply(`Error when fetching entry with id ${searchResult.results[0].id}: ${vnInfo}`);
            }
            const entry = vnInfo.results[0];
            const tags = entry.tags.filter((x: any) => x.spoiler === 0 && x.rating >= 2);

            const embed = new EmbedBuilder();
            embed.setTitle(entry.title);
            embed.setDescription(entry.description || "No data");
            if (entry.image.sexual == 0 && entry.image.violence == 0) embed.setImage(entry.image.url);
            embed.addFields({ name: "Length", value: `${entry.length_minutes / 60} hour(s)`, inline: true });
            embed.addFields({ name: "Popularity", value: entry.popularity !== "" ? String(entry.rating) : "No data", inline: true });
            embed.addFields({ name: "Rating", value: entry.rating !== "" ? String(entry.rating) : "No data", inline: true });
            embed.addFields({
                name: "Tags (Content)",
                value: (
                    tags
                        .filter((x: any) => x.category === "cont")
                        .map((x: any) => `\`${x.name}\``)
                        .join(" ") as string
                ).slice(0, 1023),
            });
            embed.setFooter({ text: `Click the title to open the page` });
            embed.setURL(`https://vndb.org/${entry.id}`);
            return message.channel.send({ embeds: [embed] });
        } else {
            return message.channel.send("No entries returned for that query");
        }
    }

    public async queryVN(queryString: string) {
        const validateRegex = /[一-龠ぁ-ゔァ-ヴー\-a-zA-Z0-9ａ-ｚＡ-Ｚ０-９々〆〤]+/u;
        if (!validateRegex.test(queryString)) {
            return null;
        }
        return await this.kana.vn.getInfo(["search", "=", queryString]);
    }

    public async querySearch(queryString: string) {
        const validateRegex = /[一-龠ぁ-ゔァ-ヴー\-a-zA-Z0-9ａ-ｚＡ-Ｚ０-９々〆〤]+/u;
        if (!validateRegex.test(queryString)) {
            return null;
        }
        return await this.kana.vn.getRaw(["search", "=", queryString], ["id", "title", "popularity", "rating", "alttitle"]);
    }

    public censor(data: string) {
        let out = data || "No description";
        // link
        out = out.replace(/\[url=(\S+)\]([\w'’ \-~!]+)\[\/url\]/g, "[$2]($1)");
        // spoiler
        out = out.replace(/\[spoiler\]/gm, "||");
        out = out.replace(/\[\/spoiler\]/gm, "||");
        // add absolute url
        out = out.replace(/\]\(\//gm, "](https://vndb.org/");
        return out;
    }
}
