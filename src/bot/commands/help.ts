import { Command } from "@sapphire/framework";
import type { Message } from "discord.js";
import { MessageEmbed } from "discord.js";

export class HelpCommand extends Command {
    public constructor(context: Command.Context, options: Command.Options) {
        super(context, {
            ...options,
            name: "help",
            description: "List available commands",
        });
    }

    public async messageRun(message: Message) {
        const commandIter = this.container.stores.get("commands").entries();
        const commands = [];
        for (const command of commandIter) {
            commands.push({
                name: command[0],
                description: command[1].description,
            });
        }
        const helpMessageEmbed = new MessageEmbed();
        helpMessageEmbed.setTitle("Help Section");
        for (const command of commands) {
            helpMessageEmbed.addField(`**${command.name}**`, command.description);
        }
        helpMessageEmbed.setTimestamp().setFooter({
            text: "Eggs",
        });
        await message.channel.send({ embeds: [helpMessageEmbed] });
    }
}
