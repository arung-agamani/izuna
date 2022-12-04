import { Args, Command } from "@sapphire/framework";
import { Message, MessageEmbed } from "discord.js";
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
                select: {
                    name: true,
                },
            });
            const embed = new MessageEmbed();
            embed.setTitle("Closure: Tags");
            embed.setDescription(`Registered tags: \n ${tags.map((x) => `\`${x.name}\``).join(" ")}`);
            await message.channel.send({ embeds: [embed] });
        } else {
            await message.channel.send("Unrecognized command");
            return;
        }
    }
}
