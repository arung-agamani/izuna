import { Command, Args } from "@sapphire/framework";
import type { Message } from "discord.js";

export class NhCommand extends Command {
    public constructor(context: Command.Context, options: Command.Options) {
        super(context, {
            ...options,
            name: "nh",
            description: "Covering your basic needs for nH----i, you degens.",
        });
    }

    public override async messageRun(message: Message, args: Args) {
        try {
            const code = await args.pick("number");
            if (code < 500000 && code > 2) {
                await message.channel.send("Sent to your DM. It's unsafe out there :)");
                await message.author.send(`https://nhentai.net/g/${code}`);
                return;
            }
            await message.author.send("Invalid code.");
        } catch (error) {
            console.error(error);
            await message.author.send(`Command returned error. Did you type non-number for the codes?`);
        }
    }
}
