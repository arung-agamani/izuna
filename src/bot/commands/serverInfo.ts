import { Command } from "@sapphire/framework";
import type { Message } from "discord.js";
import { format } from "date-fns";

export class ServerInfoCommand extends Command {
    public constructor(context: Command.Context, options: Command.Options) {
        super(context, {
            ...options,
            name: "info",
            description: "Prints common server information",
        });
    }

    public async messageRun(message: Message) {
        const guildPreview = await message.guild?.fetchPreview();
        if (!guildPreview) {
            await message.channel.send(
                "Error when fetching guild preview. Not administrator?"
            );
            return;
        }
        await message.channel.send(
            `Server ID: ${guildPreview.id}\nCreated at: ${format(
                guildPreview.createdAt,
                "p"
            )}`
        );
        return;
    }
}
