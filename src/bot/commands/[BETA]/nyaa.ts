import { Command, Args } from "@sapphire/framework";
import { Message, MessageEmbed } from "discord.js";
import axios from "axios";
import * as cheerio from "cheerio";
import { PaginatedMessage } from "@sapphire/discord.js-utilities";

interface NyaaItems {
    title: string;
    torrentLink: string;
    magnetLink: string;
    size: string;
    datePosted: string;
    seeds: number;
    leech: number;
    downloads: number;
}

const AlphanumericRegex = /^[\w\s]+$/;

export class NyaaCommand extends Command {
    public constructor(context: Command.Context, options: Command.Options) {
        super(context, {
            ...options,
            name: "nyaa",
            description:
                "Quick search if something something anime episode you're looking is available in nyaa.si\nNaa, don't use this as main source of truth. Just visit the site.\nOr watch legally, smh.",
        });
    }

    public async messageRun(message: Message, args: Args) {
        try {
            let query = await args.pick("string");
            if (!AlphanumericRegex.exec(query)) {
                await message.channel.send("Invalid query. Please fill up with alphanumeric characters + spaces");
                return;
            }
            query = query.replace(/\s+/gi, "+");
            const response = await axios.get(`https://nyaa.si/?f=0&c=1_2&q=${query}`);
            const $ = cheerio.load(response.data);
            const resultRows = $("body > div > div.table-responsive > table > tbody > tr");
            const items: NyaaItems[] = [];
            for (let i = 0; i < resultRows.length; i++) {
                const row = resultRows[i];
                const rowChildren = $(row).children();
                if (rowChildren.length >= 2) {
                    const titleColumn = $(rowChildren[1]).children();
                    let titleEl;
                    if (titleColumn.length === 2) {
                        titleEl = $(rowChildren[1]).children().first().next().text().trim();
                    } else {
                        titleEl = $(rowChildren[1]).children().text().trim();
                    }
                    const downloadSection = $(rowChildren[2]).children();
                    const torrentEl = $(downloadSection[0]).attr("href") || "";
                    const magnetEl = $(downloadSection[1]).attr("href") || "";
                    const sizeEl = $(rowChildren[3]).text().trim();
                    const dateEl = $(rowChildren[4]).text().trim();
                    const seedsEl = $(rowChildren[5]).text().trim();
                    const leechEl = $(rowChildren[6]).text().trim();
                    const downloadsEl = $(rowChildren[7]).text().trim();
                    // console.log(titleEl.trimStart().trimEnd());
                    const item: NyaaItems = {
                        title: titleEl,
                        torrentLink: torrentEl,
                        magnetLink: magnetEl,
                        size: sizeEl,
                        datePosted: dateEl,
                        seeds: Number(seedsEl),
                        leech: Number(leechEl),
                        downloads: Number(downloadsEl),
                    };
                    items.push(item);
                }
            }
            if (items.length === 0) {
                await message.channel.send("Search result returns nothing...");
                return;
            }
            const paginatedMessage = new PaginatedMessage();
            for (let i = 0; i < items.length; i += 5) {
                const page = new MessageEmbed();
                page.setTitle("Nyaa.si quick search");
                for (let j = i; j < i + 5; j++) {
                    page.addField(
                        items[j]!.title,
                        `https://nyaa.si${items[j]!.torrentLink} \nSeeds: ${items[j]!.seeds} | Leech: ${items[j]!.leech} | Downloads: ${items[j]!.downloads}`
                    );
                }
                paginatedMessage.addPageEmbed(page);
            }
            await paginatedMessage.run(message);
        } catch (error) {
            console.error(error);
            await message.author.send(`Command returned error. Did you type non-number for the codes?`);
        }
    }
}
