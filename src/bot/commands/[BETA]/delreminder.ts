import { Args, Command } from "@sapphire/framework";
import type { Message } from "discord.js";
import { config } from "../../../config";
import ReminderService from "../../../services/ReminderService";

export class DelReminderCommand extends Command {
    public constructor(context: Command.Context, options: Command.Options) {
        super(context, {
            ...options,
            name: "delreminder",
            description: "Delete a reminder message. Give a single ID for the ID to be deleted",
            flags: ["delete", "d"],
        });
    }

    public override async messageRun(message: Message, args: Args) {
        if (!config.betaTesters.includes(message.author.id)) return;
        const id = await args.pick("string");

        const reminderService = ReminderService.getInstance();

        try {
            // Check if reminder exists and belongs to the user
            const reminder = await reminderService.getReminderForUser(Number(id), message.author.id);
            if (!reminder) {
                await message.channel.send("There is no reminder with that id attached to you.");
                return;
            }

            // Delete the reminder
            await reminderService.deleteReminder(Number(id));
            await message.channel.send(`Reminder for <@${message.author.id}> with id "${reminder.id}" has been deleted`);
        } catch (error) {
            await message.channel.send(`Failed to delete reminder: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
    }
}
