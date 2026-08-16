import { ChatInputCommand, Command } from "@sapphire/framework";
import { EmbedBuilder } from "discord.js";
import { config } from "../../../config/index.js";

export class ReminderInfoSlashCommand extends Command {
    public constructor(context: Command.Context, options: Command.Options) {
        super(context, {
            ...options,
            name: "reminder-info",
            description: "[BETA] Get help and information about the reminder system",
        });
    }

    public override registerApplicationCommands(registry: ChatInputCommand.Registry) {
        registry.registerChatInputCommand((builder) => {
            builder
                .setName("reminder-info")
                .setDescription("Get help and information about the reminder system");
        });
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

        const embed1 = new EmbedBuilder()
            .setColor(0x5865f2)
            .setTitle("📅 Reminder System - Quick Start Guide")
            .setDescription(
                "The reminder system allows you to schedule automated messages that will be sent at specific times or intervals."
            )
            .addFields(
                {
                    name: "📝 Available Commands",
                    value:
                        "`/remind` - Create a new reminder\n" +
                        "`/reminder-list` - View all your reminders\n" +
                        "`/reminder-edit` - Update an existing reminder\n" +
                        "`/reminder-delete` - Delete a reminder\n" +
                        "`/reminder-info` - Show this help message",
                    inline: false,
                },
                {
                    name: "🚀 Creating Your First Reminder",
                    value:
                        "**Quick Method (Recommended)**\n" +
                        "Use `/remind quick` and choose from preset schedules:\n" +
                        "• Every 5/15/30 minutes\n" +
                        "• Every 1/2/6 hours\n" +
                        "• Daily at specific times\n" +
                        "• Weekly on specific days\n" +
                        "• Monthly reminders",
                    inline: false,
                }
            );

        const embed2 = new EmbedBuilder()
            .setColor(0x5865f2)
            .setTitle("📅 Reminder System - Advanced Options")
            .addFields(
                {
                    name: "⏰ Schedule Types",
                    value:
                        "**Daily**: `/remind daily time:09:00 message:Morning standup!`\n" +
                        "Sends every day at 9:00 AM\n\n" +
                        "**Weekly**: `/remind weekly days:monday,friday time:17:00 message:End of day review`\n" +
                        "Sends on Mondays and Fridays at 5:00 PM\n\n" +
                        "**Interval**: `/remind interval every:30 unit:minutes message:Drink water!`\n" +
                        "Sends every 30 minutes\n\n" +
                        "**Custom**: `/remind custom cron:0 9 * * * message:Custom schedule`\n" +
                        "For advanced users familiar with cron syntax",
                    inline: false,
                },
                {
                    name: "📍 Where Reminders Are Sent",
                    value:
                        "By default, reminders are sent to the **channel** where you create them.\n\n" +
                        "Add `dm:true` to any `/remind` command to receive it in your **DMs** instead.\n\n" +
                        "Example: `/remind quick preset:daily-9am message:Morning! dm:true`",
                    inline: false,
                }
            );

        const embed3 = new EmbedBuilder()
            .setColor(0x5865f2)
            .setTitle("📅 Reminder System - Examples")
            .addFields(
                {
                    name: "💡 Example 1: Daily Standup Reminder",
                    value:
                        "**Command**: `/remind daily time:09:00 message:@here Daily standup in 5 minutes!`\n" +
                        "**Result**: Reminds the team every day at 9:00 AM",
                    inline: false,
                },
                {
                    name: "💡 Example 2: Weekly Meeting",
                    value:
                        "**Command**: `/remind weekly days:monday time:14:00 message:Team meeting starts now!`\n" +
                        "**Result**: Reminds every Monday at 2:00 PM",
                    inline: false,
                },
                {
                    name: "💡 Example 3: Take Breaks",
                    value:
                        "**Command**: `/remind interval every:2 unit:hours message:Time to take a break! dm:true`\n" +
                        "**Result**: Personal reminder every 2 hours via DM",
                    inline: false,
                },
                {
                    name: "💡 Example 4: Monthly Reminder",
                    value:
                        "**Command**: `/remind quick preset:monthly-1st-9am message:Monthly report due today!`\n" +
                        "**Result**: Reminds on the 1st of each month at 9:00 AM",
                    inline: false,
                }
            );

        const embed4 = new EmbedBuilder()
            .setColor(0x5865f2)
            .setTitle("📅 Reminder System - Managing Reminders")
            .addFields(
                {
                    name: "📋 Viewing Your Reminders",
                    value:
                        "Use `/reminder-list` to see all active reminders.\n" +
                        "Each reminder shows:\n" +
                        "• ID number (for editing/deleting)\n" +
                        "• Schedule description\n" +
                        "• Where it's sent (DM or channel)\n" +
                        "• The message content",
                    inline: false,
                },
                {
                    name: "✏️ Editing Reminders",
                    value:
                        "Use `/reminder-edit` to update existing reminders:\n\n" +
                        "**Change schedule**: `/reminder-edit preset id:123 schedule:daily-noon`\n" +
                        "**Change message**: `/reminder-edit message id:123 text:New message!`\n" +
                        "**Change timing**: `/reminder-edit daily id:123 time:10:00`",
                    inline: false,
                },
                {
                    name: "🗑️ Deleting Reminders",
                    value:
                        "Use `/reminder-delete id:123` to remove a reminder.\n\n" +
                        "The command has autocomplete - start typing and you'll see your reminders!",
                    inline: false,
                }
            );

        const embed5 = new EmbedBuilder()
            .setColor(0x5865f2)
            .setTitle("📅 Reminder System - Time Formats & Tips")
            .addFields(
                {
                    name: "🕐 Time Format",
                    value:
                        "Always use **24-hour format** for times:\n" +
                        "• `09:00` = 9:00 AM\n" +
                        "• `14:30` = 2:30 PM\n" +
                        "• `17:00` = 5:00 PM\n" +
                        "• `23:59` = 11:59 PM",
                    inline: false,
                },
                {
                    name: "📆 Day Names",
                    value:
                        "Use full day names in lowercase:\n" +
                        "`monday`, `tuesday`, `wednesday`, `thursday`, `friday`, `saturday`, `sunday`\n\n" +
                        "Separate multiple days with commas: `monday,wednesday,friday`",
                    inline: false,
                },
                {
                    name: "⚙️ Advanced: Cron Expressions",
                    value:
                        "Format: `minute hour day month dayOfWeek`\n\n" +
                        "Examples:\n" +
                        "• `0 9 * * *` - Daily at 9:00 AM\n" +
                        "• `30 14 * * 1,3,5` - Mon/Wed/Fri at 2:30 PM\n" +
                        "• `0 */2 * * *` - Every 2 hours\n" +
                        "• `*/15 * * * *` - Every 15 minutes",
                    inline: false,
                },
                {
                    name: "💡 Pro Tips",
                    value:
                        "• Use autocomplete! Most options have suggestions.\n" +
                        "• Test with short intervals first, then adjust.\n" +
                        "• Use DM reminders for personal notifications.\n" +
                        "• Channel reminders can mention roles (@here, @everyone).\n" +
                        "• Timezone: All times are in Asia/Jakarta (UTC+7).",
                    inline: false,
                }
            );

        await interaction.reply({
            embeds: [embed1, embed2, embed3, embed4, embed5],
            ephemeral: true,
        });
    }
}
