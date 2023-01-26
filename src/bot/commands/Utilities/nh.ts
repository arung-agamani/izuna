import { Command, Args, ChatInputCommand } from "@sapphire/framework";
import axios from "axios";
import { Message, MessageEmbed } from "discord.js";
import * as cheerio from "cheerio";
import logger from "../../../lib/winston";

interface Title {
    english: string;
    japanese: string;
    pretty: string;
}

interface Tag {
    id: number;
    type: string;
    name: string;
    url: string;
    count: number;
}

interface NHRes {
    title: Title;
    tags: Tag[];
    scanlator: string;
    upload_date: number;
    id: number;
    media_id: string;
    num_pages: number;
}

let availableSessions: string | null = null;

export class NhCommand extends Command {
    public constructor(context: Command.Context, options: Command.Options) {
        super(context, {
            ...options,
            name: "nh",
            description: "Covering your basic needs for nH----i, you degens.",
        });
    }

    public override registerApplicationCommands(registry: ChatInputCommand.Registry) {
        registry.registerChatInputCommand(
            (builder) => {
                builder.setName("nh").setDescription("Nh tools. If you know it, you know it.");
                builder.addIntegerOption((opt) => opt.setName("nukecode").setDescription("Enter the nuke code").setRequired(true));
            },
            {
                idHints: ["1060843158734389308", "1060843160772812860"],
                guildIds: ["688349293970849812", "339763195554299904"],
            }
        );
    }

    public override async chatInputRun(interaction: Command.ChatInputInteraction) {
        const nukecode = interaction.options.getInteger("nukecode", true);
        if (nukecode < 600000 && nukecode > 2) {
            await interaction.reply({
                content: `https://nhentai.net/g/${nukecode}`,
                ephemeral: true,
            });
            return;
        } else {
            await interaction.reply({ content: "Invalid nukecode. Please enter number between 2 and 600000" });
            return;
        }
    }

    public override async messageRun(message: Message, args: Args) {
        try {
            const code = await args.pick("number");
            if (code < 600000 && code > 2) {
                await message.channel.send("Sent to your DM. It's unsafe out there :)");
                await message.author.send(`https://nhentai.net/g/${code}`);
                try {
                    if (!availableSessions) {
                        const sessionRes = await axios.post(
                            "http://peler.howlingmoon.dev/v1",
                            { cmd: "sessions.list", maxTimeout: 60000 },
                            {
                                headers: {
                                    "Content-Type": "application/json",
                                    Authorization: process.env["NHPROXY_AUTH"] || "",
                                },
                            }
                        );
                        const sessionList: { status: string; message: string; sessions: string[] } = sessionRes.data;
                        if (sessionList.status === "ok" && sessionList.sessions.length > 0) {
                            availableSessions = sessionList.sessions[0];
                            if (sessionList.sessions.length > 1) {
                                for (let i = 1; i < sessionList.sessions.length; i++) {
                                    await axios.post(
                                        "http://peler.howlingmoon.dev/v1",
                                        { cmd: "sessions.destroy", maxTimeout: 60000, session: sessionList.sessions[i] },
                                        {
                                            headers: {
                                                "Content-Type": "application/json",
                                                Authorization: process.env["NHPROXY_AUTH"] || "",
                                            },
                                        }
                                    );
                                }
                            }
                        } else {
                            const createSession = await axios.post(
                                "http://peler.howlingmoon.dev/v1",
                                { cmd: "sessions.create", maxTimeout: 60000 },
                                {
                                    headers: {
                                        "Content-Type": "application/json",
                                        Authorization: process.env["NHPROXY_AUTH"] || "",
                                    },
                                }
                            );
                            const session = createSession.data.session as string;
                            availableSessions = session;
                        }
                    }
                    const proxyRes = await axios.post(
                        `http://peler.howlingmoon.dev/v1`,
                        {
                            cmd: "request.get",
                            url: `https://nhentai.net/api/gallery/${code}`,
                            session: availableSessions,
                            maxTimeout: 6000,
                        },
                        {
                            headers: {
                                "Content-Type": "application/json",
                                Authorization: process.env["NHPROXY_AUTH"] || "",
                            },
                        }
                    );
                    const data = proxyRes.data.solution.response as string;
                    const $ = cheerio.load(data);
                    const jsonString = $("pre").text();
                    const jsonData = JSON.parse(jsonString) as NHRes;
                    const embed = new MessageEmbed();
                    embed.setTitle(jsonData.title.japanese);
                    embed.setDescription(`English: **${jsonData.title.english}**`);
                    embed.setFields([
                        {
                            name: "Parodies",
                            value:
                                jsonData.tags
                                    .filter((x) => x.type === "parody")
                                    .map((x) => `**${x.name}**`)
                                    .join(" ") || "No data",
                        },
                        {
                            name: "Characters",
                            value:
                                jsonData.tags
                                    .filter((x) => x.type === "character")
                                    .map((x) => `**${x.name}**`)
                                    .join(" ") || "No data",
                        },
                        {
                            name: "Category",
                            value:
                                jsonData.tags
                                    .filter((x) => x.type === "category")
                                    .map((x) => `**${x.name}**`)
                                    .join(" ") || "No data",
                        },
                        {
                            name: "Groups",
                            value:
                                jsonData.tags
                                    .filter((x) => x.type === "group")
                                    .map((x) => `**${x.name}**`)
                                    .join(" ") || "No data",
                        },
                        {
                            name: "Artists",
                            value:
                                jsonData.tags
                                    .filter((x) => x.type === "artist")
                                    .map((x) => `**${x.name}**`)
                                    .join(" ") || "No data",
                        },
                        {
                            name: "Tags",
                            value:
                                jsonData.tags
                                    .filter((x) => x.type === "tag")
                                    .map((x) => `**${x.name}**`)
                                    .join(" ") || "No data",
                        },
                        {
                            name: "Language",
                            value: jsonData.tags
                                .filter((x) => x.type === "language")
                                .map((x) => `**${x.name}**`)
                                .join(" "),
                        },
                    ]);
                    await message.author.send({ embeds: [embed] });
                    return;
                } catch (error) {
                    logger.error(error);
                }
            }
            await message.author.send("Invalid code.");
        } catch (error) {
            logger.error(error);
            await message.author.send(`Command returned error. Did you type non-number for the codes?`);
        }
    }
}
