import { Args, Command } from "@sapphire/framework";
import { Formatters, Message, MessageEmbed } from "discord.js";
import prisma from "../../../lib/prisma";

export class TagCommand extends Command {
    public constructor(context: Command.Context, options: Command.Options) {
        super(context, {
            ...options,
            name: "tag",
            description: "[BETA] Tag utility. Use `add` for adding and `delete` for deleting",
            flags: ["delete", "d"],
        });
    }

    public override async messageRun(message: Message, args: Args) {
        if (
            !(
                message.channel.type === "DM" ||
                message.channel.type === "GUILD_TEXT" ||
                message.channel.type === "GUILD_PUBLIC_THREAD" ||
                message.channel.type === "GUILD_PRIVATE_THREAD"
            )
        )
            return;
        const arg1 = await args.pick("string");
        if (arg1 === "add") {
            const arg2 = await args.pick("string");
            const AlphanumericRegex = /^[A-Za-z0-9]+$/;
            if (!AlphanumericRegex.test(arg2)) {
                await message.channel.send("Invalid tag validation. Please input only alphanumeric characters in single word.");
                return;
            }
            const attachments = Array.from(message.attachments.values());
            if (message.attachments.size === 0) {
                const arg3 = await args.rest("string", { minimum: 1 });
                const data = {
                    name: arg2,
                    userId: message.author.id,
                    guildId: message.guildId || "",
                    dateCreated: new Date(),
                    message: arg3,
                    isMedia: false,
                    isGuild: message.inGuild(),
                };
                if (message.inGuild()) {
                    const tag = await prisma.tag.findFirst({
                        where: {
                            guildId: message.guildId,
                            name: arg2,
                        },
                    });
                    if (tag) {
                        await prisma.tag.updateMany({
                            data,
                            where: {
                                guildId: message.guildId,
                                name: arg2,
                            },
                        });
                    } else {
                        await prisma.tag.create({
                            data,
                        });
                    }
                } else {
                    const tag = await prisma.tag.findFirst({
                        where: {
                            userId: message.author.id,
                            name: arg2,
                        },
                    });
                    if (tag) {
                        await prisma.tag.updateMany({
                            data,
                            where: {
                                userId: message.author.id,
                                name: arg2,
                            },
                        });
                    } else {
                        await prisma.tag.create({
                            data,
                        });
                    }
                }
                await message.channel.send(`Tag **${arg2}** registered`);
                return;
            } else {
                const data = {
                    name: arg2,
                    userId: message.author.id,
                    guildId: message.guildId || "",
                    dateCreated: new Date(),
                    message: attachments[0]!.url,
                    isMedia: true,
                    isGuild: message.inGuild(),
                };
                if (message.inGuild()) {
                    const tag = await prisma.tag.findFirst({
                        where: {
                            guildId: message.guildId,
                            name: arg2,
                        },
                    });
                    if (tag) {
                        await prisma.tag.updateMany({
                            data,
                            where: {
                                guildId: message.guildId,
                                name: arg2,
                            },
                        });
                    } else {
                        await prisma.tag.create({
                            data,
                        });
                    }
                } else {
                    const tag = await prisma.tag.findFirst({
                        where: {
                            userId: message.author.id,
                        },
                    });
                    if (tag) {
                        await prisma.tag.updateMany({
                            data,
                            where: {
                                userId: message.author.id,
                                name: arg2,
                            },
                        });
                    } else {
                        await prisma.tag.create({
                            data,
                        });
                    }
                }
                await message.channel.send(`Tag **${arg2}** registered`);
                return;
            }
        } else if (arg1 === "list") {
            const isGuild = message.inGuild();
            const tags = await prisma.tag.findMany({
                where: {
                    guildId: isGuild ? message.guildId : "",
                },
            });
            try {
                const arg2 = await args.pick("string");
                const AlphanumericRegex = /^[A-Za-z0-9]+$/;
                if (!AlphanumericRegex.test(arg2)) {
                    await message.channel.send("Invalid tag validation. Please input only alphanumeric characters in single word.");
                    return;
                }
                const embed = new MessageEmbed();
                embed.setTitle("Closure: Tags (search mode)");
                embed.setDescription(
                    `Registered tags similar with ${arg2}: \n ${tags
                        .map((x: any) => `\`${x.name}\``)
                        .filter((x) => x.match(new RegExp(arg2, "i")))
                        .join(" ")}`
                );
                await message.channel.send({ embeds: [embed] });
            } catch (error) {
                const embed = new MessageEmbed();
                embed.setTitle("Closure: Tags");
                embed.setDescription(`Registered tags: \n ${tags.map((x: any) => `\`${x.name}\``).join(" ")}`);
                await message.channel.send({ embeds: [embed] });
            }
        } else if (arg1 === "info") {
            let arg2;
            try {
                arg2 = await args.pick("string");
            } catch (error) {
                await message.channel.send("Incorrect value for arg2. Please input tag name");
                return;
            }
            const AlphanumericRegex = /^[A-Za-z0-9]+$/;
            if (!AlphanumericRegex.test(arg2)) {
                await message.channel.send("Invalid tag validation. Please input only alphanumeric characters in single word.");
                return;
            }
            const isGuild = message.inGuild();
            const tag = await prisma.tag.findFirst({
                where: {
                    name: arg2,
                    isGuild,
                },
            });
            if (!tag) {
                await message.channel.send(`There is no tag with name \`${arg2}\`.`);
                return;
            }
            const embed = new MessageEmbed();
            embed.setTitle(`Closure: Tag Info`);
            embed.setDescription(`**${tag.name}**
            Submitter: ${Formatters.userMention(tag.userId)}
            Date added : ${tag.dateCreated.toLocaleDateString("id")}
            Is Media? : ${tag.isMedia ? "True" : "False"}
            Content: ${tag.message.length > 500 ? `${tag.message.slice(0, 499)}... _message truncated_` : tag.message}
            `);
            await message.channel.send({ embeds: [embed] });
            return;
        } else if (arg1 === "delete") {
            // WIP
            await message.channel.send("WIP command. :)");
            return;
        } else {
            await message.channel.send("Unrecognized command");
            return;
        }
    }
}
