import { Command, Args } from "@sapphire/framework";
import type { Message } from "discord.js";

export class EchoCommand extends Command {
    public constructor(context: Command.Context, options: Command.Options) {
        super(context, {
            ...options,
            name: "echo",
            aliases: ["parrot", "copy"],
            description: "Sugar will echo your string-typed message.",
        });
    }

    public async messageRun(message: Message, args: Args) {
        const msg = await args.rest("string")
        await message.channel.send(msg);
    }
}