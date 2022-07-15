import { Command } from "@sapphire/framework";
import type { Message } from "discord.js";

export class ShouldCommand extends Command {
    public constructor(context: Command.Context, options: Command.Options) {
        super(context, {
            ...options,
            name: "should",
            aliases: ["shall"],
            description:
                "Spews out sugar's thoughts about 'should/shall' question. Only limited to those keywords only",
        });
    }

    public async messageRun(message: Message) {
        const answer = Math.random() > 0.5 ? "Yes" : "No";
        await message.channel.send(answer);
    }
}
