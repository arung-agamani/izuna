import { ChatInputCommand, Command } from "@sapphire/framework";
import { EmbedBuilder } from "discord.js";
import { config } from "../../../config";
import ReminderService from "../../../services/ReminderService";
import { describeCron } from "../../../lib/cronUtils";

export class ReminderListSlashCommand extends Command {
    public constructor(context: Command.Context, options: Command.Options) {
        super(context, {
            ...options,
            name: "reminder-list",
            description: "[BETA] List all your active reminders",
        });
    }

    public override registerApplicationCommands(registry: ChatInputCommand.Registry) {
        registry.registerChatInputCommand((builder) => {
            builder
                .setName("reminder-list")
                .setDescription("View all your active reminders")
                .addBooleanOption((opt) =>
                    opt
                        .setName("ephemeral")
                        .setDescription("Show only to you (default: true)")
                        .setRequired(false)
                );
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

        const isEphemeral = interaction.options.getBoolean("ephemeral") ?? true;
        const reminderService = ReminderService.getInstance();

        try {
            const reminders = await reminderService.listReminders({
                userId: interaction.user.id,
            });

            if (reminders.length === 0) {
                await interaction.reply({
                    content: "📭 You have no active reminders.\n\nCreate one with `/remind`!",
                    ephemeral: isEphemeral,
                });
                return;
            }

            // Create embeds for reminders (Discord has a limit of 25 fields per embed)
            const embeds: EmbedBuilder[] = [];
            const remindersPerEmbed = 10;

            for (let i = 0; i < reminders.length; i += remindersPerEmbed) {
                const chunk = reminders.slice(i, i + remindersPerEmbed);
                const embed = new EmbedBuilder()
                    .setColor(0x5865f2)
                    .setTitle(i === 0 ? `📋 Your Active Reminders (${reminders.length})` : `📋 Reminders (continued)`)
                    .setFooter({ text: `Page ${Math.floor(i / remindersPerEmbed) + 1}` });

                for (const reminder of chunk) {
                    const location = reminder.channelType === "DM"
                        ? "📬 DM"
                        : `📍 <#${reminder.channelId}>`;

                    const schedule = describeCron(reminder.cronString);

                    embed.addFields({
                        name: `ID: ${reminder.id} | ${location}`,
                        value: `⏰ ${schedule}\n💬 ${reminder.message.length > 100 ? reminder.message.substring(0, 100) + "..." : reminder.message}`,
                        inline: false,
                    });
                }

                embeds.push(embed);
            }

            // Statistics footer on last embed
            const stats = {
                dm: reminders.filter((r) => r.channelType === "DM").length,
                channel: reminders.filter((r) => r.channelType === "CHANNEL").length,
            };

            embeds[embeds.length - 1].addFields({
                name: "📊 Statistics",
                value: `DM Reminders: ${stats.dm} | Channel Reminders: ${stats.channel}`,
                inline: false,
            });

            await interaction.reply({
                embeds,
                ephemeral: isEphemeral,
            });
        } catch (error) {
            await interaction.reply({
                content: `❌ Failed to list reminders: ${error instanceof Error ? error.message : "Unknown error"}`,
                ephemeral: true,
            });
        }
    }
}
