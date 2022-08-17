import { Command } from "@sapphire/framework";
import type { Message } from "discord.js";
import prisma from "../../lib/prisma";
import { sub, formatDistanceToNow } from "date-fns";

interface Response {
    name: string;
    weight: number;
    response: string;
}

export class FeedCommand extends Command {
    public constructor(context: Command.Context, options: Command.Options) {
        super(context, {
            ...options,
            name: "feed",
            aliases: ["makan"],
            description: "Feeds Sugar various stuff.\nAlso gacha hell, haha",
        });
    }

    public async messageRun(message: Message) {
        const foods: Response[] = [
            {
                name: "Donut",
                weight: 1,
                response:
                    "...\n..\n.\nAren't ya one cheap person. But still appreciated, ...n-nyaa.",
            },
            {
                name: "Roti Yoland",
                weight: 2,
                response:
                    "Now we're talking! Hey, wanna know what flavor of roti yoland that I think the best? Hehe.... ひ。み。つ！",
            },
            {
                name: "Black Thunder",
                weight: 3,
                response:
                    "Wow, this is something. Sweet stuff! And crunchy! (❁´◡`❁)",
            },
            {
                name: "Burger Nasi GKUB",
                weight: 5,
                response:
                    "Hmm... Something pricey... And this small? Alright, not really my favorite because it can get messy real fast, but I do like the flavor!\n",
            },
            {
                name: "Nasi Ayam Mang Otot",
                weight: 7,
                response:
                    "Ah I remember this. Not only the fact you can do paylater mechanic with mang otot, they have various of sauces too!\nCan you guess what are my favorite combos of sauce???",
            },
            {
                name: "Ayam Crisbar",
                weight: 8,
                response:
                    "MmmhhhHH!!!!!! Gotta love how you can wareg as much as you want on these Crisbar stalls.\nHey, hey, I can handle up to 5!.... Level 5 of spiciness, I mean!\nI didn't imply something else, alright!",
            },
            {
                name: "Whiskas",
                weight: 10,
                response:
                    "WOOAAAAAAAHHH! ARE YOU SURE YOU'RE GIVING ME THIS, NYAA? MMMHHHHHH CAN I CALL YOU MASTER FROM NOW ON?? CAN I??!! CAN I???!!!!!!!",
            },
        ];
        const gachaFunction = () => {
            const rng = Math.random();
            if (rng > 0.35) {
                // Common
                return 0;
            } else if (rng > 0.15) {
                // Rare
                const idx = [1, 2];
                return idx[Math.floor(Math.random() * idx.length)]!;
            } else if (rng > 0.06) {
                // Super Rare
                const idx = [3, 4];
                return idx[Math.floor(Math.random() * idx.length)]!;
            } else if (rng > 0.03) {
                // Sangat Super Rare
                const idx = [5];
                return idx[Math.floor(Math.random() * idx.length)]!;
            } else {
                // UWOOOOOGH Rare
                return 6;
            }
        };
        const rngIndex = gachaFunction() || 0;
        const rngChoice = foods[rngIndex]?.name;
        const rngWeight = foods[rngIndex]?.weight;
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
                `You've feed me ${deltaTime} ago, nyaa. Let me sleep, nyaw...`
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
            `[BETA]\nYou've fed me ${rngChoice}!\n${foods[rngIndex]?.response}`
        );
    }
}
