import { Args, Command } from "@sapphire/framework";
import type { Message } from "discord.js";
import { MessageEmbed } from "discord.js";
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

    public async messageRun(message: Message, args: Args) {
        try {
            const arg1 = await args.rest("string");
            const command = this.container.stores.get("commands").get(arg1);
            if (!command) {
                await message.channel.send(`Command \`${arg1}\` not found.`);
                return;
            }
            const helpMessageEmbed = new MessageEmbed();
            helpMessageEmbed.setTitle(`Help Section - ${arg1}`);
            helpMessageEmbed.addField("Name", command.name);
            if (command.aliases.length > 0) helpMessageEmbed.addField("Aliases", command.aliases.map((x) => `\`${x}\``).join(" "));
            helpMessageEmbed.addField("Description", command.description);
            if (command.detailedDescription === "") {
                helpMessageEmbed.addField("Details", "No info");
            } else helpMessageEmbed.addField("Details", command.detailedDescription.toString());
            await message.channel.send({ embeds: [helpMessageEmbed] });
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
            const helpMessageEmbed = new MessageEmbed();
            helpMessageEmbed.setTitle("Help Section");
            for (const [category, categorySet] of Array.from(categories.entries())) {
                let description = "";
                for (const command of categorySet) {
                    description += `\`${command}\` `;
                }
                helpMessageEmbed.addField(`**${category}**`, description);
            }
            helpMessageEmbed.setDescription("Use `closure help [command-name]` for further detail on each command.");
            helpMessageEmbed.setTimestamp().setFooter({
                text: "Eggs",
            });
            await message.channel.send({ embeds: [helpMessageEmbed] });
        }
    }
}
