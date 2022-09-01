import { Command } from "@sapphire/framework";
import type { Message } from "discord.js";
// import prisma from "../../lib/prisma";

interface Response {
    name: string;
    weight: number;
    response: string;
}

export class SimulateGachaCommand extends Command {
    public constructor(context: Command.Context, options: Command.Options) {
        super(context, {
            ...options,
            name: "simulate",
            aliases: ["sim"],
            description: "Simulate gacha",
        });
    }

    public async messageRun(message: Message) {
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
        let ketsuron = `Sugar gacha simulation for <@${message.author.id}>\n`;
        for (let i = 0; i < 10; i++) {
            const rngIndex = gachaFunction() || 0;
            const rngChoice = foods[rngIndex]?.name;
            // const rngWeight = foods[rngIndex]?.weight;
            const a = Math.random();
            if (a > 0.99675) {
                ketsuron += `${i + 1}. **CUCUMBER**\n`;
            } else {
                ketsuron += `${i + 1}. ${rngChoice}\n`;
            }
        }
        await message.channel.send(ketsuron);
    }
}
