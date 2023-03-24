import { Command, Args } from "@sapphire/framework";
import { Formatters, Message, MessageEmbed, MessageActionRow, MessageButton } from "discord.js";
import axios from "axios";
import * as cheerio from "cheerio";
import { PaginatedMessage } from "@sapphire/discord.js-utilities";
import { Kana, getKanaInstance } from "../../../lib/kana";
import { MessageButtonStyles } from "discord.js/typings/enums";

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
            const row = new MessageActionRow();
            let i = 1;
            for (const entry of searchResult.results.slice(0, 5)) {
                msg += `${entry.title} | Popularity: ${entry.popularity} | Rating: ${entry.rating}\n`;
                const button = new MessageButton();
                button.setLabel(String(i)).setCustomId(String(entry.id));
                button.setStyle(MessageButtonStyles.PRIMARY);
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

            const embed = new MessageEmbed();
            embed.setTitle(entry.title);
            embed.setDescription(entry.description || "No data");
            if (entry.image.sexual == 0 && entry.image.violence == 0) embed.setImage(entry.image.url);
            embed.addField("Length", `${entry.length_minutes / 60} hour(s)`, true);
            embed.addField("Popularity", entry.popularity !== "" ? String(entry.rating) : "No data", true);
            embed.addField("Rating", entry.rating !== "" ? String(entry.rating) : "No data", true);
            embed.addField(
                "Tags (Content)",
                (
                    tags
                        .filter((x: any) => x.category === "cont")
                        .map((x: any) => `\`${x.name}\``)
                        .join(" ") as string
                ).slice(0, 1023)
            );
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
}
