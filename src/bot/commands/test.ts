import { Command } from "@sapphire/framework";
import { Message, MessageEmbed } from "discord.js";
import reminderCollection from "../../lib/reminder";
// import prisma from "../../lib/prisma";

export class TestCommand extends Command {
    public constructor(context: Command.Context, options: Command.Options) {
        super(context, {
            ...options,
            name: "test",
            description: "test sandbox",
        });
    }

    public async messageRun(message: Message) {
        console.log(message.channel.type);
        const allReminders = Array.from(reminderCollection.values());
        if (allReminders.length === 0) {
            return await message.channel.send("No reminders has set");
        }
        const embedMessage = new MessageEmbed();
        embedMessage.setTitle("Current reminder for this user");
        for (const reminder of allReminders) {
            embedMessage.addField(
                `${reminder.message} -- ID: ${reminder.id}`,
                `Cron string: **${reminder.cronString}**`
            );
        }
        return await message.channel.send({ embeds: [embedMessage] });
    }
}
