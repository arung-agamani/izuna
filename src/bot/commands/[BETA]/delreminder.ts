import { Args, Command } from "@sapphire/framework";
import type { Message } from "discord.js";
import { config } from "../../../config";
import prisma from "../../../lib/prisma";
import reminderCollection, { restartReminderJob } from "../../../lib/reminder";

export class DelReminderCommand extends Command {
    public constructor(context: Command.Context, options: Command.Options) {
        super(context, {
            ...options,
            name: "delreminder",
            description: "Delete a reminder message. Give a single ID for the ID to be deleted",
            flags: ["delete", "d"],
        });
    }

    public async messageRun(message: Message, args: Args) {
        if (!config.betaTesters.includes(message.author.id)) return;
        const id = await args.pick("string");

        // search for id
        const reminder = await prisma.reminder.findFirst({
            where: {
                id: Number(id),
                uid: message.author.id,
            },
        });
        if (!reminder) {
            await message.channel.send("There is no reminder with that id attached to you.");
            return;
        }
        await prisma.reminder.delete({
            where: {
                id: Number(id),
            },
        });
        if (reminderCollection.delete(Number(id))) {
            await message.channel.send(`Reminder for <@${message.author.id}> with id "${reminder.id}" has been delete`);
        } else {
            await message.channel.send(`Reminder for <@${message.author.id}> with id "${reminder.id}" has failed to delete`);
        }
        restartReminderJob(this.container.client);
    }
}
