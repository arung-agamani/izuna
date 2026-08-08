import { Args, ChatInputCommand, Command } from "@sapphire/framework";
import type { Message } from "discord.js";
import { EmbedBuilder } from "discord.js";

export class HelpCommand extends Command {
    public constructor(context: Command.Context, options: Command.Options) {
        super(context, {
            ...options,
            name: "help",
            description: "List available commands",
        });
    }

    public override registerApplicationCommands(registry: ChatInputCommand.Registry) {
        registry.registerChatInputCommand((builder) =>
            builder
                .setName("help")
                .setDescription("List available commands")
                .addStringOption((option) =>
                    option.setName("command").setDescription("Specific command to get help for").setRequired(false),
                ),
        );
    }

    public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
        const commandName = interaction.options.getString("command");
        const payload = commandName ? this.buildCommandHelp(commandName) : this.buildFullHelp();
        if (interaction.replied || interaction.deferred) {
            await interaction.editReply(payload);
        } else {
            await interaction.reply({ ...payload, ephemeral: true });
        }
    }

    public override async messageRun(message: Message, args: Args) {
        const query = args.finished ? null : await args.rest("string").catch(() => null);
        const payload = query ? this.buildCommandHelp(query) : this.buildFullHelp();
        if (message.channel.isSendable()) {
            await message.channel.send(payload);
        }
    }

    /**
     * Build the full command listing embed, grouped by category and sorted alphabetically.
     */
    private buildFullHelp() {
        const store = this.container.stores.get("commands");
        const categories = new Map<string, string[]>();

        for (const [name, cmd] of store.entries()) {
            const category = cmd.category || "Uncategorized";
            if (!categories.has(category)) categories.set(category, []);
            const desc = cmd.description;
            const summary = desc.length > 56 ? desc.slice(0, 56) + "…" : desc;
            categories.get(category)!.push(`\`${name}\` — ${summary}`);
        }

        const embed = new EmbedBuilder()
            .setTitle("Help Section")
            .setColor("#5865F2")
            .setDescription("Use `izuna help <command>` or `/help <command>` for details on a specific command.");

        const sortedCategories = [...categories.entries()].sort(([a], [b]) => a.localeCompare(b));
        for (const [category, lines] of sortedCategories) {
            lines.sort((a, b) => a.localeCompare(b));
            embed.addFields({ name: category, value: lines.join("\n") });
        }

        embed.setTimestamp().setFooter({ text: `${store.size} commands` });
        return { embeds: [embed] };
    }

    /**
     * Build a single-command help embed. Returns a not-found message if the command doesn't exist.
     */
    private buildCommandHelp(commandName: string) {
        const command = this.container.stores.get("commands").get(commandName);
        if (!command) {
            return { content: `Command \`${commandName}\` not found.` };
        }

        const embed = new EmbedBuilder()
            .setTitle(`Help: \`${command.name}\``)
            .setColor("#5865F2");

        const category = command.category || "Uncategorized";
        embed.addFields({ name: "Category", value: category, inline: true });

        const hasSlash = command.supportsChatInputCommands();
        embed.addFields({ name: "Slash", value: hasSlash ? "✅" : "❌", inline: true });

        embed.addFields({ name: "Description", value: command.description });

        if (command.detailedDescription && command.detailedDescription !== "") {
            const detail = command.detailedDescription.toString();
            embed.addFields({ name: "Details", value: detail.length > 1024 ? detail.slice(0, 1021) + "…" : detail });
        }

        if (command.aliases.length > 0) {
            embed.addFields({ name: "Aliases", value: command.aliases.map((a) => `\`${a}\``).join(", ") });
        }

        return { embeds: [embed] };
    }
}
