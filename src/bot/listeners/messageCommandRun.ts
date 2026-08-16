import { Command } from "@sapphire/framework";
import { MessageCommandRunPayload } from "@sapphire/framework";
import { Events, Listener } from "@sapphire/framework";
import type { Message } from "discord.js";
import logger from "../../lib/winston.js";

export class MessageRunListener extends Listener {
    public constructor(context: Listener.Context, options: Listener.Options) {
        super(context, {
            ...options,
            event: Events.MessageCommandRun,
        });
    }

    public run(message: Message, command: Command, _payload: MessageCommandRunPayload) {
        logger.info("command_invoked", {
            event: "command_invoked",
            command: command.name,
            source: "message",
            guildId: message.guildId,
            userId: message.author.id,
        });
    }
}
