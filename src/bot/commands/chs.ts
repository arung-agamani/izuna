import { Args, Command } from "@sapphire/framework";
import type { Message } from "discord.js";

export class ChooseCommand extends Command {
    public constructor(context: Command.Context, options: Command.Options) {
        super(context, {
            ...options,
            name: "chs",
            aliases: ["choose", "pilih", "mending"],
            quotes: [],
            description: "Choose from random items. Separated with whitespace(s) or a comma (with optional trailing spaces).",
        });
    }

    public async messageRun(message: Message, args: Args) {
        const r = /[\s, ]+/gi;
        let allItems: string[] = [];
        try {
            const stringArgs = (await args.rest("string"));
            allItems = stringArgs.split(r);
            const sample =
                allItems[Math.floor(Math.random() * allItems.length)]!;
            await message.channel.send(sample);
        } catch (error) {
            await message.channel.send(
                "Sugar can't choose from what you've given me, nyaa. Please try again."
            );
            return;
        }
    }
}
