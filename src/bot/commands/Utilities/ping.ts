import { Command } from "@sapphire/framework";
import type { Message } from "discord.js";

export class PingCommand extends Command {
    public constructor(context: Command.Context, options: Command.Options) {
        super(context, {
            ...options,
            name: "ping",
            aliases: ["pong"],
            description: "ping pong",
        });
    }

    public async messageRun(message: Message) {
        const msg = await message.channel.send("Ping?");
        const content = `Pong!!! Bot latency: ${Math.round(
            this.container.client.ws.ping
        )}ms. API latency ${
            msg.createdTimestamp - message.createdTimestamp
        }ms.`;
        return msg.edit(content);
    }
}
