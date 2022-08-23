import { Args, Command } from "@sapphire/framework";
import { Message, MessageEmbed } from "discord.js";
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
            aliases: ["makan", "mangan"],
            description: "Feeds Sugar various stuff.\nAlso gacha hell, haha",
            flags: ["history", "h"],
        });
    }

    public async messageRun(message: Message, args: Args) {
        const foods: Response[] = [
            {
                name: "Donut (Common)",
                weight: 1,
                response:
                    "...\n..\n.\nAren't ya one cheap person. But still appreciated, ...n-nyaa.",
            },
            {
                name: "Roti Yoland (Rare)",
                weight: 2,
                response:
                    "Now we're talking! Hey, wanna know what flavor of roti yoland that I think the best? Hehe.... ひ。み。つ！",
            },
            {
                name: "Black Thunder (Rare)",
                weight: 3,
                response:
                    "Wow, this is something. Sweet stuff! And crunchy! (❁´◡`❁)",
            },
            {
                name: "Burger Nasi GKUB (Super Rare)",
                weight: 5,
                response:
                    "Hmm... Something pricey... And this small? Alright, not really my favorite because it can get messy real fast, but I do like the flavor!\n",
            },
            {
                name: "Nasi Ayam Mang Otot (Super Rare)",
                weight: 7,
                response:
                    "Ah I remember this. Not only the fact you can do paylater mechanic with mang otot, they have various of sauces too!\nCan you guess what are my favorite combos of sauce???",
            },
            {
                name: "Ayam Crisbar (Sangat Super Rare)",
                weight: 8,
                response:
                    "MmmhhhHH!!!!!! Gotta love how you can wareg as much as you want on these Crisbar stalls.\nHey, hey, I can handle up to 5!.... Level 5 of spiciness, I mean!\nI didn't imply something else, alright!",
            },
            {
                name: "Whiskas (UWOOOOGH Rare)",
                weight: 10,
                response:
                    "WOOAAAAAAAHHH! ARE YOU SURE YOU'RE GIVING ME THIS, NYAA? MMMHHHHHH CAN I CALL YOU MASTER FROM NOW ON?? CAN I??!! CAN I???!!!!!!!",
            },
        ];
        const isRequestingHistory = args.getFlags("history", "h");
        if (isRequestingHistory) {
            if (!message.guild) {
                await message.channel.send(
                    "Can't do this command outside the server, nyaa"
                );
                return;
            }
            const feedHistory = await prisma.feedRecord.findMany({
                where: {
                    from: message.author.id,
                },
                orderBy: {
                    date: "desc",
                },
                take: 10,
            });
            const embed = new MessageEmbed();
            embed.setTitle(
                `Feed history for ${
                    (await message.guild.members.fetch(message.author.id))
                        .displayName
                }`
            );
            let rekishi = "";
            for (let i = 0; i < feedHistory.length; i++) {
                rekishi += `${i + 1}. ${
                    foods.find((x) => x.weight === feedHistory[i]?.amount)?.name
                }\n`;
            }
            embed.setDescription(rekishi);
            await message.channel.send({ embeds: [embed] });
            return;
        }

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
        const recordOfZonkFeed = await prisma.feedRecord.findFirst({
            where: {
                from: message.author.id,
                amount: -15,
                date: {
                    gt: sub(new Date(), { hours: 24 }),
                },
            },
        });
        if (recordOfZonkFeed) {
            await message.channel.send(
                `Didn't I tell you to go away? HISSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSS`
            );
            return;
        }
        if (Math.random() > 0.99675) {
            await prisma.feedRecord.create({
                data: {
                    from: message.author.id,
                    amount: -15,
                    date: new Date(),
                },
            });
            await message.channel.send(
                `[BETA]\nYou're trying to give me a cucumber. What does that even mean???!!\nHIISSSSSSSSSSSSSSSSSSSS--------------------\nI hate you. I HATE YOU! Don't you ever go seeing me again for the next 24 hours.`
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
