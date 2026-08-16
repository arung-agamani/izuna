import { ChatInputCommand, Command } from "@sapphire/framework";
import { AutocompleteInteraction } from "discord.js";
import { config } from "../../../config/index.js";
import ReminderService from "../../../services/ReminderService.js";
import { describeCron } from "../../../lib/cronUtils.js";

export class ReminderDeleteSlashCommand extends Command {
    public constructor(context: Command.Context, options: Command.Options) {
        super(context, {
            ...options,
            name: "reminder-delete",
            description: "[BETA] Delete one of your reminders",
        });
    }

    public override registerApplicationCommands(registry: ChatInputCommand.Registry) {
        registry.registerChatInputCommand((builder) => {
            builder
                .setName("reminder-delete")
                .setDescription("Delete a reminder")
                .addIntegerOption((opt) =>
                    opt
                        .setName("id")
                        .setDescription("The ID of the reminder to delete")
                        .setRequired(true)
                        .setAutocomplete(true)
                );
        });
    }

    public override async autocompleteRun(interaction: AutocompleteInteraction) {
        const reminderService = ReminderService.getInstance();

        try {
            const reminders = await reminderService.listReminders({
                userId: interaction.user.id,
            });

            const focusedValue = interaction.options.getFocused();

            // Create choices with ID and description
            const choices = reminders.map((reminder) => {
                const schedule = describeCron(reminder.cronString);
                const message = reminder.message.length > 50
                    ? reminder.message.substring(0, 50) + "..."
                    : reminder.message;

                return {
                    name: `ID ${reminder.id} | ${schedule} | ${message}`,
                    value: reminder.id,
                };
            });

            // Filter based on focused value
            const filtered = choices.filter((choice) =>
                choice.name.toLowerCase().includes(focusedValue.toString().toLowerCase()) ||
                choice.value.toString().includes(focusedValue.toString())
            );

            await interaction.respond(filtered.slice(0, 25)); // Discord limit is 25
        } catch {
            // If error, return empty array
            await interaction.respond([]);
        }
    }

    public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
        // Beta tester check
        if (!config.betaTesters.includes(interaction.user.id)) {
            await interaction.reply({
                content: "This command is currently in beta and only available to beta testers.",
                ephemeral: true,
            });
            return;
        }

        const reminderId = interaction.options.getInteger("id", true);
        const reminderService = ReminderService.getInstance();

        try {
            // Check if reminder exists and belongs to user
            const reminder = await reminderService.getReminderForUser(reminderId, interaction.user.id);

            if (!reminder) {
                await interaction.reply({
                    content: "❌ Reminder not found. Make sure the ID is correct and belongs to you.",
                    ephemeral: true,
                });
                return;
            }

            // Store reminder info before deletion
            const reminderInfo = {
                id: reminder.id,
                schedule: describeCron(reminder.cronString),
                message: reminder.message,
                location: reminder.channelType === "DM" ? "DM" : `<#${reminder.channelId}>`,
            };

            // Delete the reminder
            await reminderService.deleteReminder(reminderId);

            await interaction.reply({
                content: `✅ **Reminder Deleted!**\n\n` +
                    `📝 **ID**: ${reminderInfo.id}\n` +
                    `⏰ **Was scheduled**: ${reminderInfo.schedule}\n` +
                    `📍 **Location**: ${reminderInfo.location}\n` +
                    `💬 **Message**: ${reminderInfo.message}`,
                ephemeral: false,
            });
        } catch (error) {
            await interaction.reply({
                content: `❌ Failed to delete reminder: ${error instanceof Error ? error.message : "Unknown error"}`,
                ephemeral: true,
            });
        }
    }
}
