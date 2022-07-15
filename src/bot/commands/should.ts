import { Command } from "@sapphire/framework";
import type { Message } from "discord.js";

export class ShouldCommand extends Command {
    public constructor(context: Command.Context, options: Command.Options) {
        super(context, {
            ...options,
            name: "should",
            aliases: ["shall", "ryn", "bolehkah", "apakah", "am", "is", "are"],
            description:
                "Spews out sugar's thoughts about 'should/shall' question. Only limited to those keywords only",
        });
    }

    public async messageRun(message: Message) {
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
