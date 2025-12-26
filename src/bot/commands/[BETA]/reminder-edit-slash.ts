import { ChatInputCommand, Command } from "@sapphire/framework";
import { AutocompleteInteraction } from "discord.js";
import { config } from "../../../config";
import ReminderService from "../../../services/ReminderService";
import {
    createDailyCron,
    createWeeklyCron,
    createIntervalCron,
    describeCron,
    getPresetChoices,
    validateCronString,
    type DayOfWeek,
    type TimeUnit,
} from "../../../lib/cronUtils";

export class ReminderEditSlashCommand extends Command {
    public constructor(context: Command.Context, options: Command.Options) {
        super(context, {
            ...options,
            name: "reminder-edit",
            description: "[BETA] Edit an existing reminder",
        });
    }

    public override registerApplicationCommands(registry: ChatInputCommand.Registry) {
        registry.registerChatInputCommand((builder) => {
            builder
                .setName("reminder-edit")
                .setDescription("Edit an existing reminder")
                // Subcommand: Update with preset
                .addSubcommand((sub) =>
                    sub
                        .setName("preset")
                        .setDescription("Update reminder schedule using a preset")
                        .addIntegerOption((opt) => opt.setName("id").setDescription("The ID of the reminder to edit").setRequired(true).setAutocomplete(true))
                        .addStringOption((opt) => opt.setName("schedule").setDescription("Choose a preset schedule").setRequired(true).setAutocomplete(true)),
                )
                // Subcommand: Update message
                .addSubcommand((sub) =>
                    sub
                        .setName("message")
                        .setDescription("Update the reminder message")
                        .addIntegerOption((opt) => opt.setName("id").setDescription("The ID of the reminder to edit").setRequired(true).setAutocomplete(true))
                        .addStringOption((opt) => opt.setName("text").setDescription("New reminder message").setRequired(true)),
                )
                // Subcommand: Update to daily
                .addSubcommand((sub) =>
                    sub
                        .setName("daily")
                        .setDescription("Update to daily schedule")
                        .addIntegerOption((opt) => opt.setName("id").setDescription("The ID of the reminder to edit").setRequired(true).setAutocomplete(true))
                        .addStringOption((opt) => opt.setName("time").setDescription("Time in 24-hour format (HH:MM, e.g., 09:00)").setRequired(true)),
                )
                // Subcommand: Update to weekly
                .addSubcommand((sub) =>
                    sub
                        .setName("weekly")
                        .setDescription("Update to weekly schedule")
                        .addIntegerOption((opt) => opt.setName("id").setDescription("The ID of the reminder to edit").setRequired(true).setAutocomplete(true))
                        .addStringOption((opt) =>
                            opt.setName("days").setDescription("Days of week (comma-separated: monday,wednesday,friday)").setRequired(true),
                        )
                        .addStringOption((opt) => opt.setName("time").setDescription("Time in 24-hour format (HH:MM, e.g., 09:00)").setRequired(true)),
                )
                // Subcommand: Update to interval
                .addSubcommand((sub) =>
                    sub
                        .setName("interval")
                        .setDescription("Update to interval-based schedule")
                        .addIntegerOption((opt) => opt.setName("id").setDescription("The ID of the reminder to edit").setRequired(true).setAutocomplete(true))
                        .addIntegerOption((opt) => opt.setName("every").setDescription("Repeat every X units").setRequired(true).setMinValue(1))
                        .addStringOption((opt) =>
                            opt
                                .setName("unit")
                                .setDescription("Time unit")
                                .setRequired(true)
                                .addChoices({ name: "Minutes", value: "minutes" }, { name: "Hours", value: "hours" }, { name: "Days", value: "days" }),
                        ),
                )
                // Subcommand: Custom cron
                .addSubcommand((sub) =>
                    sub
                        .setName("custom")
                        .setDescription("Update with custom cron expression (advanced)")
                        .addIntegerOption((opt) => opt.setName("id").setDescription("The ID of the reminder to edit").setRequired(true).setAutocomplete(true))
                        .addStringOption((opt) => opt.setName("cron").setDescription("Cron expression (e.g., '0 9 * * *')").setRequired(true)),
                );
        });
    }

    public override async autocompleteRun(interaction: AutocompleteInteraction) {
        const focusedOption = interaction.options.getFocused(true);
        const reminderService = ReminderService.getInstance();

        // Autocomplete for reminder ID
        if (focusedOption.name === "id") {
            try {
                const reminders = await reminderService.listReminders({
                    userId: interaction.user.id,
                });

                const choices = reminders.map((reminder) => {
                    const schedule = describeCron(reminder.cronString);
                    const message = reminder.message.length > 40 ? reminder.message.substring(0, 40) + "..." : reminder.message;

                    return {
                        name: `ID ${reminder.id} | ${schedule} | ${message}`,
                        value: reminder.id,
                    };
                });

                const filtered = choices.filter(
                    (choice) =>
                        choice.name.toLowerCase().includes(focusedOption.value.toString().toLowerCase()) ||
                        choice.value.toString().includes(focusedOption.value.toString()),
                );

                await interaction.respond(filtered.slice(0, 25));
            } catch (error) {
                await interaction.respond([]);
            }
        }

        // Autocomplete for preset schedule
        if (focusedOption.name === "schedule") {
            const choices = getPresetChoices();
            const filtered = choices.filter((choice) => choice.name.toLowerCase().includes(focusedOption.value.toLowerCase()));
            await interaction.respond(filtered.slice(0, 25));
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
        const subcommand = interaction.options.getSubcommand();
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

            let newCronString: string | null = null;
            let newMessage: string | undefined = undefined;
            let updateType = "";

            // Process based on subcommand
            switch (subcommand) {
                case "preset": {
                    newCronString = interaction.options.getString("schedule", true);
                    updateType = "schedule";
                    break;
                }

                case "message": {
                    newMessage = interaction.options.getString("text", true);
                    updateType = "message";
                    break;
                }

                case "daily": {
                    const time = interaction.options.getString("time", true);
                    newCronString = createDailyCron(time);
                    if (!newCronString) {
                        await interaction.reply({
                            content: "❌ Invalid time format. Please use 24-hour format (HH:MM), e.g., 09:00 or 14:30",
                            ephemeral: true,
                        });
                        return;
                    }
                    updateType = "schedule";
                    break;
                }

                case "weekly": {
                    const daysStr = interaction.options.getString("days", true);
                    const time = interaction.options.getString("time", true);

                    const validDays: DayOfWeek[] = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
                    const days = daysStr
                        .toLowerCase()
                        .split(",")
                        .map((d) => d.trim())
                        .filter((d): d is DayOfWeek => validDays.includes(d as DayOfWeek));

                    if (days.length === 0) {
                        await interaction.reply({
                            content: "❌ Invalid days. Use comma-separated day names: monday,wednesday,friday",
                            ephemeral: true,
                        });
                        return;
                    }

                    newCronString = createWeeklyCron(days, time);
                    if (!newCronString) {
                        await interaction.reply({
                            content: "❌ Invalid time format. Please use 24-hour format (HH:MM), e.g., 09:00 or 14:30",
                            ephemeral: true,
                        });
                        return;
                    }
                    updateType = "schedule";
                    break;
                }

                case "interval": {
                    const every = interaction.options.getInteger("every", true);
                    const unit = interaction.options.getString("unit", true) as TimeUnit;

                    newCronString = createIntervalCron(every, unit);
                    if (!newCronString) {
                        await interaction.reply({
                            content: "❌ Invalid interval. Please check your values and try again.",
                            ephemeral: true,
                        });
                        return;
                    }
                    updateType = "schedule";
                    break;
                }

                case "custom": {
                    newCronString = interaction.options.getString("cron", true);
                    if (!validateCronString(newCronString)) {
                        await interaction.reply({
                            content:
                                "❌ Invalid cron expression. Please check the syntax and try again.\n" +
                                "Format: `minute hour day month dayOfWeek`\n" +
                                "Example: `0 9 * * *` (daily at 9 AM)",
                            ephemeral: true,
                        });
                        return;
                    }
                    updateType = "schedule";
                    break;
                }

                default:
                    await interaction.reply({
                        content: "❌ Unknown subcommand",
                        ephemeral: true,
                    });
                    return;
            }

            // Update the reminder
            const updatedReminder = await reminderService.updateReminder(reminderId, {
                cronString: newCronString || undefined,
                message: newMessage,
            });

            // Success response
            const oldSchedule = describeCron(reminder.cronString);
            const newSchedule = newCronString ? describeCron(newCronString) : oldSchedule;
            const location = reminder.channelType === "DM" ? "DM" : `<#${reminder.channelId}>`;

            let responseMessage = `✅ **Reminder Updated!**\n\n📝 **ID**: ${updatedReminder.id}\n📍 **Location**: ${location}\n`;

            if (updateType === "schedule") {
                responseMessage += `⏰ **Old Schedule**: ${oldSchedule}\n⏰ **New Schedule**: ${newSchedule}\n`;
                responseMessage += `💬 **Message**: ${updatedReminder.message}`;
            } else if (updateType === "message") {
                responseMessage += `⏰ **Schedule**: ${newSchedule}\n`;
                responseMessage += `💬 **Old Message**: ${reminder.message}\n`;
                responseMessage += `💬 **New Message**: ${updatedReminder.message}`;
            }

            await interaction.reply({
                content: responseMessage,
                ephemeral: false,
            });
        } catch (error) {
            await interaction.reply({
                content: `❌ Failed to update reminder: ${error instanceof Error ? error.message : "Unknown error"}`,
                ephemeral: true,
            });
        }
    }
}
