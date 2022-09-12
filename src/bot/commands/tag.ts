import { Args, Command } from "@sapphire/framework";
import type { Message } from "discord.js";
import prisma from "../../lib/prisma";

export class TagCommand extends Command {
    public constructor(context: Command.Context, options: Command.Options) {
        super(context, {
            ...options,
            name: "tag",
            description: "[BETA] Tag utility. Use `add` for adding and `delete` for deleting",
            flags: ["delete", "d"],
        });
    }

    public async messageRun(message: Message, args: Args) {
        if (!(message.channel.type === "DM" || message.channel.type === "GUILD_TEXT")) return;
        const arg1 = await args.pick("string");
        if (arg1 === "add") {
            const arg2 = await args.pick("string");
            const attachments = Array.from(message.attachments.values());
            if (message.attachments.size === 0) {
                const arg3 = await args.rest("string", { minimum: 1 });
                await prisma.tag.create({
                    data: {
                        name: arg2,
                        userId: message.author.id,
                        dateCreated: new Date(),
                        message: arg3,
                        isMedia: false,
                    },
                });
                await message.channel.send(`Tag **${arg2}** registered`);
                return;
            } else {
                await prisma.tag.create({
                    data: {
                        name: arg2,
                        userId: message.author.id,
                        dateCreated: new Date(),
                        message: attachments[0]!.url,
                        isMedia: true,
                    },
                });
                await message.channel.send(`Tag **${arg2}** registered`);
                return;
            }
        } else {
            await message.channel.send("Unrecognized command");
            return;
        }
    }
}
