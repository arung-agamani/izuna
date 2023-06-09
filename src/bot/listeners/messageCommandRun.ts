import { Command } from "@sapphire/framework";
import { MessageCommandRunPayload } from "@sapphire/framework";
import { Events, Listener } from "@sapphire/framework";
import type { Client } from "discord.js";
import { Message } from "discord.js";
import logger from "../../lib/winston";

export class MessageRunListener extends Listener {
    public constructor(context: Listener.Context, options: Listener.Options) {
        super(context, {
            ...options,
            event: Events.MessageCommandRun,
        });
    }

    public run(message: Message, command: Command, payload: MessageCommandRunPayload) {
        // console.log(`${command.name} command is being run with message "${message.content}"`);
        logger.debug({
            message: `${command.name} command executed with message: ` + message.content,
            label: {
                source: this.event,
                handler: command.name,
            },
        });
    }
}
