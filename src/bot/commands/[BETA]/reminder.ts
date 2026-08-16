import { Args, Command } from "@sapphire/framework";
import { ChannelType, Message } from "discord.js";
import { config } from "../../../config/index.js";
import ReminderService from "../../../services/ReminderService.js";
import { logError } from "../../../lib/winston.js";

export class ReminderCommand extends Command {
    public constructor(context: Command.Context, options: Command.Options) {
        super(context, {
            ...options,
            name: "reminder",
            description: "[BETA] Send a reminder message. If done in server channel, will be sent ",
            flags: ["delete", "d"],
        });
    }

    public override async messageRun(message: Message, args: Args) {
        if (!(message.channel.type === ChannelType.DM || message.channel.type === ChannelType.GuildText)) return;
        if (!config.betaTesters.includes(message.author.id)) return;

        const cronString = await args.pick("string");
        const msg = await args.pick("string");
        const isDelete = args.getFlags("delete", "d");

        const reminderService = ReminderService.getInstance();

        // Validate cron string
        if (!reminderService.validateCronString(cronString)) {
            await message.channel.send("Cron string is not valid");
            return;
        }

        if (isDelete) {
            await message.channel.send("Delete flag detected. WIP response");
            return;
        }

        try {
            const reminder = await reminderService.createReminder({
                uid: message.author.id,
                message: msg,
                cronString,
                channelType: message.channel.type === ChannelType.DM ? "DM" : "CHANNEL",
                guildId: message.guildId || undefined,
                channelId: message.channelId,
            });

            await message.channel.send(
                `Set reminder for <@${message.author.id}> with id "${reminder.id}", cron string \`"${cronString}"\`, and message "${msg}"`,
            );
        } catch (error) {
            logError("Failed to create reminder", error);
            await message.channel.send(`Failed to create reminder: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
    }
}
