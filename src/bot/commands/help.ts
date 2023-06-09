import { Args, Command } from "@sapphire/framework";
import type { Message } from "discord.js";
import { EmbedBuilder } from "discord.js";
import logger from "../../lib/winston";

type CategoryMap = Map<string, Set<string>>;

export class HelpCommand extends Command {
    public constructor(context: Command.Context, options: Command.Options) {
        super(context, {
            ...options,
            name: "help",
            description: "List available commands",
        });
    }

    public override async messageRun(message: Message, args: Args) {
        try {
            const arg1 = await args.rest("string");
            const command = this.container.stores.get("commands").get(arg1);
            if (!command) {
                await message.channel.send(`Command \`${arg1}\` not found.`);
                return;
            }
            const helpEmbedBuilder = new EmbedBuilder();
            helpEmbedBuilder.setTitle(`Help Section - ${arg1}`);
            helpEmbedBuilder.addFields({ name: "Name", value: command.name });
            if (command.aliases.length > 0) helpEmbedBuilder.addFields({ name: "Aliases", value: command.aliases.map((x) => `\`${x}\``).join(" ") });
            helpEmbedBuilder.addFields({ name: "Description", value: command.description });
            if (command.detailedDescription === "") {
                helpEmbedBuilder.addFields({ name: "Details", value: "No info" });
            } else helpEmbedBuilder.addFields({ name: "Details", value: command.detailedDescription.toString() });
            await message.channel.send({ embeds: [helpEmbedBuilder] });
            return;
        } catch (error) {
            const commandIter = this.container.stores.get("commands").entries();
            const categories: CategoryMap = new Map<string, Set<string>>();
            for (const command of commandIter) {
                let fullCategory = command[1].fullCategory;
                if (fullCategory.length === 0) fullCategory = ["Others"];
                for (const category of fullCategory) {
                    if (categories.has(category)) {
                        const categorySet = categories.get(category);
                        categorySet?.add(command[0]);
                    } else {
                        const newCategory = new Set<string>();
                        newCategory.add(command[0]);
                        categories.set(category, newCategory);
                    }
                }
            }
            const helpEmbedBuilder = new EmbedBuilder();
            helpEmbedBuilder.setTitle("Help Section");
            for (const [category, categorySet] of Array.from(categories.entries())) {
                let description = "";
                for (const command of categorySet) {
                    description += `\`${command}\` `;
                }
                helpEmbedBuilder.addFields({ name: `**${category}**`, value: description });
            }
            helpEmbedBuilder.setDescription("Use `closure help [command-name]` for further detail on each command.");
            helpEmbedBuilder.setTimestamp().setFooter({
                text: process.env["BUILD_REF"] || "Eggs",
            });
            await message.channel.send({ embeds: [helpEmbedBuilder] });
        }
    }
}
