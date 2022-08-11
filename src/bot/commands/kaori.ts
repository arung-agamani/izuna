import { Command } from "@sapphire/framework";
import type { Message } from "discord.js";

export class KaoriCommand extends Command {
    public constructor(context: Command.Context, options: Command.Options) {
        super(context, {
            ...options,
            name: "kaori",
            aliases: [],
            description: "Kaori mentioned",
        });
    }

    public async messageRun(message: Message) {
        await message.channel.send("Kaori mentioned.");
        await message.channel.send(
            "https://cdn.discordapp.com/attachments/699967986471272510/1007334443842801795/kaori_gelud.mp4"
        );
    }
}
