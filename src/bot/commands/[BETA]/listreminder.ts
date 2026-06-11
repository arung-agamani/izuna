import { Command } from "@sapphire/framework";
import type { Message } from "discord.js";
import { config } from "../../../config";
import ReminderService from "../../../services/ReminderService";

export class ListReminderCommand extends Command {
    public constructor(context: Command.Context, options: Command.Options) {
        super(context, {
            ...options,
            name: "listreminder",
            description: "[BETA] List all your active reminders",
            aliases: ["listreminders", "reminders"],
        });
    }

    public override async messageRun(message: Message) {
        if (!config.betaTesters.includes(message.author.id)) return;

        const reminderService = ReminderService.getInstance();

        try {
            const reminders = await reminderService.listReminders({
                userId: message.author.id,
            });

            if (reminders.length === 0) {
                if (message.channel.isSendable()) await message.channel.send("You have no active reminders.");
                return;
            }

            // Build a formatted list of reminders
            const reminderList = reminders
                .map((reminder) => {
                    const location =
                        reminder.channelType === "DM"
                            ? "DM"
                            : `<#${reminder.channelId}>`;
                    return `**ID ${reminder.id}**: \`${reminder.cronString}\`\n└ Location: ${location}\n└ Message: ${reminder.message}`;
                })
                .join("\n\n");

            // Split into multiple messages if too long
            const maxLength = 2000;
            if (reminderList.length <= maxLength) {
                if (message.channel.isSendable()) await message.channel.send(
                    `**Your Active Reminders (${reminders.length}):**\n\n${reminderList}`
                );
            } else {
                // Split by reminder entries
                if (message.channel.isSendable()) await message.channel.send(
                    `**Your Active Reminders (${reminders.length}):**`
                );
                let currentChunk = "";
                for (const reminder of reminders) {
                    const location =
                        reminder.channelType === "DM"
                            ? "DM"
                            : `<#${reminder.channelId}>`;
                    const entry = `**ID ${reminder.id}**: \`${reminder.cronString}\`\n└ Location: ${location}\n└ Message: ${reminder.message}\n\n`;

                    if ((currentChunk + entry).length > maxLength) {
                        if (message.channel.isSendable()) await message.channel.send(currentChunk);
                        currentChunk = entry;
                    } else {
                        currentChunk += entry;
                    }
                }
                if (currentChunk) {
                    if (message.channel.isSendable()) await message.channel.send(currentChunk);
                }
            }
        } catch (error) {
            if (message.channel.isSendable()) await message.channel.send(
                `Failed to list reminders: ${error instanceof Error ? error.message : "Unknown error"}`
            );
        }
    }
}
