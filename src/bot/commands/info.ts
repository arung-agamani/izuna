import { Command } from "@sapphire/framework";
import { Message, MessageEmbed } from "discord.js";
import prisma from "../../lib/prisma";

export class InfoCommand extends Command {
    public constructor(context: Command.Context, options: Command.Options) {
        super(context, {
            ...options,
            name: "info",
            aliases: ["ingfo"],
            description: "Prints user info",
        });
    }

    public async messageRun(message: Message) {
        const user = await prisma.user.findFirst({
            where: {
                uid: message.author.id,
            },
        });
        const infoMessageEmbed = new MessageEmbed();
        infoMessageEmbed.setTitle("User Info");
        infoMessageEmbed.addField(
            `Common Info`,
            `Name: **${message.author.username}**\nUserId: ${message.author.id}`
        );
        if (!user) {
            infoMessageEmbed.addField(
                "Relation with Sugar",
                `Sugar: "who are you?"`
            );
        } else {
            const totalScore = await prisma.feedRecord.aggregate({
                _sum: {
                    amount: true,
                },
            });
            infoMessageEmbed.addField(
                `Relation with Sugar`,
                `Sugar: "Hey, I recognize this guy, nyaa!\nHis/her user point is ${totalScore
                    ._sum.amount!}\nKeep feeding me, nyaa!"`
            );
        }
        infoMessageEmbed.setTimestamp().setFooter({
            text: "Eggs",
        });
        await message.channel.send({ embeds: [infoMessageEmbed] });
    }
}
