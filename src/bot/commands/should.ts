import prisma from "../../lib/prisma";
import { Command } from "@sapphire/framework";
import type { Message } from "discord.js";
import { sub } from "date-fns";

export class ShouldCommand extends Command {
    public constructor(context: Command.Context, options: Command.Options) {
        super(context, {
            ...options,
            name: "should",
            aliases: [
                "shall",
                "ryn",
                "bolehkah",
                "apakah",
                "am",
                "is",
                "are",
                "how",
            ],
            description:
                "Spews out sugar's thoughts about 'should/shall' question. Only limited to those keywords only",
        });
    }

    public async messageRun(message: Message) {
        const userScore = await prisma.feedRecord.aggregate({
            _sum: {
                amount: true,
            },
            where: {
                from: message.author.id,
            },
        });
        const totalScore = await prisma.feedRecord.aggregate({
            _sum: {
                amount: true,
            },
        });
        const activationFunction = (user: number, total: number) => {
            const ratio = Math.exp(Math.log10(user / total));
            return ratio;
        };
        const positiveAnswers = ["Yes", "Yes!", "YESSS!!!"];
        const ssrAnswer =
            "Of course yes, master. Anything you think the best I also think the best";
        const whiskasRecently = await prisma.feedRecord.findFirst({
            where: {
                amount: 10,
                date: {
                    gt: sub(new Date(), { hours: 3 }),
                },
            },
        });
        if (whiskasRecently) {
            if (
                activationFunction(
                    userScore._sum.amount!,
                    totalScore._sum.amount!
                ) > 0.5
            ) {
                await message.channel.send(ssrAnswer);
                return;
            }

            const answer =
                positiveAnswers[
                    Math.floor(Math.random() * positiveAnswers.length)
                ]!;
            await message.channel.send(answer);
            return;
        }

        const answers = [
            "Yes",
            "No",
            "Bayar uang kas dulu.",
            "Silahkan coba lagi.",
        ];
        const answer = answers[Math.floor(Math.random() * answers.length)]!;
        await message.channel.send(answer);
    }
}
