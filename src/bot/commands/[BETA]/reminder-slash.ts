import { ChatInputCommand, Command } from "@sapphire/framework";
import { ChannelType, AutocompleteInteraction, ApplicationCommandOptionType } from "discord.js";
import { config } from "../../../config";
import ReminderService from "../../../services/ReminderService";
import { createDailyCron, createWeeklyCron, createIntervalCron, describeCron, getPresetChoices, validateCronString, type DayOfWeek, type TimeUnit } from "../../../lib/cronUtils";

export class ReminderSlashCommand extends Command {
    public constructor(context: Command.Context, options: Command.Options) {
        super(context, {
            ...options,
            name: "remind",
            description: "[BETA] Create a reminder that sends messages at scheduled times",
        });
    }

    public override registerApplicationCommands(registry: ChatInputCommand.Registry) {
        registry.registerChatInputCommand((builder) => {
            builder
                .setName("remind")
                .setDescription("Create a reminder that sends messages at scheduled times")
                // Subcommand: Quick preset
                .addSubcommand((sub) =>
                    sub
                        .setName("quick")
                        .setDescription("Create a reminder using common presets")
                        .addStringOption((opt) =>
                            opt
                                .setName("preset")
                                .setDescription("Choose a preset schedule")
                                .setRequired(true)
                                .setAutocomplete(true)
                        )
                        .addStringOption((opt) =>
                            opt.setName("message").setDescription("The reminder message").setRequired(true)
                        )
                        .addBooleanOption((opt) =>
                            opt
                                .setName("dm")
                                .setDescription("Send to DM instead of this channel (default: false)")
                                .setRequired(false)
                        )
                )
                // Subcommand: Daily
                .addSubcommand((sub) =>
                    sub
                        .setName("daily")
                        .setDescription("Create a daily reminder at a specific time")
                        .addStringOption((opt) =>
                            opt
                                .setName("time")
                                .setDescription("Time in 24-hour format (HH:MM, e.g., 09:00 or 14:30)")
                                .setRequired(true)
                        )
                        .addStringOption((opt) =>
                            opt.setName("message").setDescription("The reminder message").setRequired(true)
                        )
                        .addBooleanOption((opt) =>
                            opt
                                .setName("dm")
                                .setDescription("Send to DM instead of this channel (default: false)")
                                .setRequired(false)
                        )
                )
                // Subcommand: Weekly
                .addSubcommand((sub) =>
                    sub
                        .setName("weekly")
                        .setDescription("Create a weekly reminder on specific days")
                        .addStringOption((opt) =>
                            opt
                                .setName("days")
                                .setDescription("Days of week (comma-separated: monday,wednesday,friday)")
                                .setRequired(true)
                        )
                        .addStringOption((opt) =>
                            opt
                                .setName("time")
                                .setDescription("Time in 24-hour format (HH:MM, e.g., 09:00 or 14:30)")
                                .setRequired(true)
                        )
                        .addStringOption((opt) =>
                            opt.setName("message").setDescription("The reminder message").setRequired(true)
                        )
                        .addBooleanOption((opt) =>
                            opt
                                .setName("dm")
                                .setDescription("Send to DM instead of this channel (default: false)")
                                .setRequired(false)
                        )
                )
                // Subcommand: Interval
                .addSubcommand((sub) =>
                    sub
                        .setName("interval")
                        .setDescription("Create a reminder that repeats at regular intervals")
                        .addIntegerOption((opt) =>
                            opt
                                .setName("every")
                                .setDescription("Repeat every X units")
                                .setRequired(true)
                                .setMinValue(1)
                        )
                        .addStringOption((opt) =>
                            opt
                                .setName("unit")
                                .setDescription("Time unit")
                                .setRequired(true)
                                .addChoices(
                                    { name: "Minutes", value: "minutes" },
                                    { name: "Hours", value: "hours" },
                                    { name: "Days", value: "days" }
                                )
                        )
                        .addStringOption((opt) =>
                            opt.setName("message").setDescription("The reminder message").setRequired(true)
                        )
                        .addBooleanOption((opt) =>
                            opt
                                .setName("dm")
                                .setDescription("Send to DM instead of this channel (default: false)")
                                .setRequired(false)
                        )
                )
                // Subcommand: Custom (for advanced users)
                .addSubcommand((sub) =>
                    sub
                        .setName("custom")
                        .setDescription("Create a reminder with a custom cron expression (advanced)")
                        .addStringOption((opt) =>
                            opt
                                .setName("cron")
                                .setDescription("Cron expression (e.g., '0 9 * * *' for daily at 9 AM)")
                                .setRequired(true)
                        )
                        .addStringOption((opt) =>
                            opt.setName("message").setDescription("The reminder message").setRequired(true)
                        )
                        .addBooleanOption((opt) =>
                            opt
                                .setName("dm")
                                .setDescription("Send to DM instead of this channel (default: false)")
                                .setRequired(false)
                        )
                );
        });
    }

    public override async autocompleteRun(interaction: AutocompleteInteraction) {
        const focusedOption = interaction.options.getFocused(true);

        if (focusedOption.name === "preset") {
            const choices = getPresetChoices();
            const filtered = choices.filter((choice) =>
                choice.name.toLowerCase().includes(focusedOption.value.toLowerCase())
            );
            await interaction.respond(filtered.slice(0, 25)); // Discord limit is 25
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

        const subcommand = interaction.options.getSubcommand();
        const reminderService = ReminderService.getInstance();

        try {
            let cronString: string | null = null;
            let message: string;
            let isDM: boolean;

            // Get common options
            message = interaction.options.getString("message", true);
            isDM = interaction.options.getBoolean("dm") ?? false;

            // Process based on subcommand
            switch (subcommand) {
                case "quick": {
                    cronString = interaction.options.getString("preset", true);
                    break;
                }

                case "daily": {
                    const time = interaction.options.getString("time", true);
                    cronString = createDailyCron(time);
                    if (!cronString) {
                        await interaction.reply({
                            content: "❌ Invalid time format. Please use 24-hour format (HH:MM), e.g., 09:00 or 14:30",
                            ephemeral: true,
                        });
                        return;
                    }
                    break;
                }

                case "weekly": {
                    const daysStr = interaction.options.getString("days", true);
                    const time = interaction.options.getString("time", true);

                    // Parse days
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

                    cronString = createWeeklyCron(days, time);
                    if (!cronString) {
                        await interaction.reply({
                            content: "❌ Invalid time format. Please use 24-hour format (HH:MM), e.g., 09:00 or 14:30",
                            ephemeral: true,
                        });
                        return;
                    }
                    break;
                }

                case "interval": {
                    const every = interaction.options.getInteger("every", true);
                    const unit = interaction.options.getString("unit", true) as TimeUnit;

                    cronString = createIntervalCron(every, unit);
                    if (!cronString) {
                        await interaction.reply({
                            content: "❌ Invalid interval. Please check your values and try again.",
                            ephemeral: true,
                        });
                        return;
                    }
                    break;
                }

                case "custom": {
                    cronString = interaction.options.getString("cron", true);
                    if (!validateCronString(cronString)) {
                        await interaction.reply({
                            content: "❌ Invalid cron expression. Please check the syntax and try again.\n" +
                                "Format: `minute hour day month dayOfWeek`\n" +
                                "Example: `0 9 * * *` (daily at 9 AM)",
                            ephemeral: true,
                        });
                        return;
                    }
                    break;
                }

                default:
                    await interaction.reply({
                        content: "❌ Unknown subcommand",
                        ephemeral: true,
                    });
                    return;
            }

            if (!cronString) {
                await interaction.reply({
                    content: "❌ Failed to create cron expression",
                    ephemeral: true,
                });
                return;
            }

            // Determine channel info
            let channelType: "DM" | "CHANNEL";
            let channelId: string;
            let guildId: string | undefined;

            if (isDM) {
                channelType = "DM";
                channelId = interaction.user.id;
                guildId = undefined;
            } else {
                if (!interaction.channel || interaction.channel.type === ChannelType.DM) {
                    await interaction.reply({
                        content: "❌ Cannot create channel reminder in DMs. Use the `dm:true` option instead.",
                        ephemeral: true,
                    });
                    return;
                }
                channelType = "CHANNEL";
                channelId = interaction.channelId;
                guildId = interaction.guildId || undefined;
            }

            // Create the reminder
            const reminder = await reminderService.createReminder({
                uid: interaction.user.id,
                message,
                cronString,
                channelType,
                guildId,
                channelId,
            });

            // Success response
            const description = describeCron(cronString);
            const location = isDM ? "your DMs" : `<#${channelId}>`;

            await interaction.reply({
                content: `✅ **Reminder Created!**\n\n` +
                    `📝 **ID**: ${reminder.id}\n` +
                    `⏰ **Schedule**: ${description}\n` +
                    `📍 **Location**: ${location}\n` +
                    `💬 **Message**: ${message}\n\n` +
                    `Use \`/reminder-list\` to see all your reminders or \`/reminder-delete ${reminder.id}\` to remove it.`,
                ephemeral: false,
            });
        } catch (error) {
            await interaction.reply({
                content: `❌ Failed to create reminder: ${error instanceof Error ? error.message : "Unknown error"}`,
                ephemeral: true,
            });
        }
    }
}
