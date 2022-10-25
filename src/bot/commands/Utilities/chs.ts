import { Args, Command } from "@sapphire/framework";
import type { Message } from "discord.js";

export class ChooseCommand extends Command {
    public constructor(context: Command.Context, options: Command.Options) {
        super(context, {
            ...options,
            name: "chs",
            aliases: ["choose"],
            quotes: [],
            description:
                "Choose from random items. Can be separated using single or double quotes.",
        });
    }

    public async messageRun(message: Message, args: Args) {
        // const r = new RegExp(`[^\s"']+|"([^"]*)"|'([^']*)'`, "ig");
        const r = /[^\s"']+|"([^"]*)"|'([^']*)'/gi;
        let allItems: string[] = [];
        try {
            const stringArgs = (await args.rest("string"))
                .replace(/“/g, '"')
                .replace(/”/g, '"');
            // console.log(stringArgs);
            const splitByQuotes = stringArgs
                .match(r)
                ?.map((a) => a.trimStart().trimEnd())!;
            splitByQuotes
                .filter((x) => {
                    if (x.startsWith("'") || x.startsWith('"')) return false;
                    else return true;
                })
                .forEach((x) => {
                    allItems = allItems.concat(x.split(" "));
                });
            allItems = allItems.concat(
                splitByQuotes
                    .filter((x) => {
                        if (
                            (x.startsWith("'") && x.endsWith("'")) ||
                            (x.startsWith('"') && x.endsWith('"'))
                        )
                            return true;
                        else return false;
                    })
                    .map((x) => x.replace(/"/g, ""))
            );
            allItems = allItems.filter((x) => x.length > 0);
            const sample =
                allItems[Math.floor(Math.random() * allItems.length)]!;
            await message.channel.send(sample);
        } catch (error) {
            await message.channel.send(
                "You do not give any arguments, as it seems..."
            );
            return;
        }
    }
}
