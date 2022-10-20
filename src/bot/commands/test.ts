import { Command, Args } from "@sapphire/framework";
import type { Message } from "discord.js";
import { getGoogleClient } from "../../lib/google";
// import prisma from "../../lib/prisma";

export class TestCommand extends Command {
    public constructor(context: Command.Context, options: Command.Options) {
        super(context, {
            ...options,
            name: "test",
            description: "test sandbox",
        });
    }

    public async messageRun(message: Message, args: Args) {
        const url = await args.rest("string");
        const regex = /\/file\/d\/([^\/]+)/;
        const id = regex.exec(url);
        if (!id) {
            await message.channel.send("Invalid url");
            return;
        }
        const fileId = id[1]!;
        const drive = getGoogleClient();
        const file = await drive.files.get({
            fileId,
            fields: "webContentLink",
        });
        console.log(file);
        await message.channel.send("Url valid. Check your logs");
    }
}
