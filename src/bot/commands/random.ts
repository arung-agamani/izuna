import { Command } from "@sapphire/framework";
import type { Message } from "discord.js";

export class RandomCommand extends Command {
    public constructor(context: Command.Context, options: Command.Options) {
        super(context, {
            ...options,
            name: "random",
            aliases: ["rand"],
            description: "gives random number from 0 to 100, nyaa!",
        });
    }

    public async messageRun(message: Message) {
        const rand = Math.floor(Math.random() * 100);
        await message.channel.send(
            `RNGoddess has bestowed upon thee with the number **${rand}**`
        );
    }
}
