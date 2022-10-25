import { Command } from "@sapphire/framework";
import type { Message } from "discord.js";

export class TestCommand extends Command {
    public constructor(context: Command.Context, options: Command.Options) {
        super(context, {
            ...options,
            name: "test",
            description: "test sandbox",
        });
    }

    public async messageRun(message: Message) {
        await message.channel.send("...echoing requiem");
    }
}
