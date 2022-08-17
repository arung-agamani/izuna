import { Command } from "@sapphire/framework";
import type { Message } from "discord.js";
import prisma from "../../lib/prisma";
import { sub, formatDistanceToNow } from "date-fns";

export class FeedCommand extends Command {
    public constructor(context: Command.Context, options: Command.Options) {
        super(context, {
            ...options,
            name: "feed",
            aliases: ["makan"],
            description: "Feeds Sugar donut or roti yoland or whiskas.",
        });
    }

    public async messageRun(message: Message) {
        const food = ["Donut", "Roti Yoland", "Whiskas"]; // Weight 1, 2, 10
        const foodWeight = [1, 2, 10];
        const foodResponses = [
            "...\n..\n.\nAren't ya one cheap person. But still appreciated, ...n-nyaa.",
            "Now we're talking! Hey, wanna know what flavor of roti yoland that I think the best? Hehe.... ひ。み。つ！",
            "WOOAAAAAAAHHH! ARE YOU SURE YOU'RE GIVING ME THIS, NYAA? MMMHHHHHH CAN I CALL YOU MASTER FROM NOW ON?? CAN I??!! CAN I???!!!!!!!",
        ];
        const rngIndex = Math.floor(Math.random() * food.length);
        const rngChoice = food[rngIndex];
        const rngWeight = foodWeight[rngIndex];
        let user = await prisma.user.findUnique({
            where: {
                uid: message.author.id,
            },
        });
        if (!user) {
            user = await prisma.user.create({
                data: {
                    uid: message.author.id,
                    name: message.author.username,
                },
            });
        }
        const recordOfRecentFeed = await prisma.feedRecord.findFirst({
            where: {
                from: message.author.id,
                date: {
                    gt: sub(new Date(), { hours: 3 }),
                },
            },
        });
        if (recordOfRecentFeed) {
            const deltaTime = formatDistanceToNow(recordOfRecentFeed.date);
            await message.channel.send(
                `You've feed me ${deltaTime}, nyaa. Let me sleep, nyaw...`
            );
            return;
        }
        await prisma.feedRecord.create({
            data: {
                from: message.author.id,
                amount: rngWeight!,
                date: new Date(),
            },
        });
        await message.channel.send(
            `[BETA]\nYou've fed me ${rngChoice}!\n${foodResponses[rngIndex]}`
        );
    }
}
