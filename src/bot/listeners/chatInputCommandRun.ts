import { Command } from "@sapphire/framework";
import { ChatInputCommandRunPayload } from "@sapphire/framework";
import { Events, Listener } from "@sapphire/framework";
import type { CommandInteraction } from "discord.js";
import logger from "../../lib/winston.js";
import { commandInvokedTotal } from "../../lib/metrics.js";

export class ChatInputRunListener extends Listener {
    public constructor(context: Listener.Context, options: Listener.Options) {
        super(context, {
            ...options,
            event: Events.ChatInputCommandRun,
        });
    }

    public run(interaction: CommandInteraction, command: Command, _payload: ChatInputCommandRunPayload) {
        logger.info("command_invoked", {
            event: "command_invoked",
            command: command.name,
            source: "slash",
            guildId: interaction.guildId,
            userId: interaction.user.id,
        });
        commandInvokedTotal.inc({ command: command.name, source: "slash" });
    }
}
