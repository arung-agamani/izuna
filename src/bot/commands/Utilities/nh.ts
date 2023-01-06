import { Command, Args, ChatInputCommand } from "@sapphire/framework";
import type { Message } from "discord.js";

export class NhCommand extends Command {
    public constructor(context: Command.Context, options: Command.Options) {
        super(context, {
            ...options,
            name: "nh",
            description: "Covering your basic needs for nH----i, you degens.",
        });
    }

    public override registerApplicationCommands(registry: ChatInputCommand.Registry) {
        registry.registerChatInputCommand(
            (builder) => {
                builder.setName("nh").setDescription("Nh tools. If you know it, you know it.");
                builder.addIntegerOption((opt) => opt.setName("nukecode").setDescription("Enter the nuke code").setRequired(true));
            },
            {
                idHints: ["1060843158734389308", "1060843160772812860"],
                guildIds: ["688349293970849812", "339763195554299904"],
            }
        );
    }

    public override async chatInputRun(interaction: Command.ChatInputInteraction) {
        const nukecode = interaction.options.getInteger("nukecode", true);
        if (nukecode < 600000 && nukecode > 2) {
            await interaction.reply({
                content: `https://nhentai.net/g/${nukecode}`,
                ephemeral: true,
            });
            return;
        } else {
            await interaction.reply({ content: "Invalid nukecode. Please enter number between 2 and 600000" });
            return;
        }
    }

    public override async messageRun(message: Message, args: Args) {
        try {
            const code = await args.pick("number");
            if (code < 600000 && code > 2) {
                await message.channel.send("Sent to your DM. It's unsafe out there :)");
                await message.author.send(`https://nhentai.net/g/${code}`);
                return;
            }
            await message.author.send("Invalid code.");
        } catch (error) {
            console.error(error);
            await message.author.send(`Command returned error. Did you type non-number for the codes?`);
        }
    }
}
