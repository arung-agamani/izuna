import { ChatInputCommand, Command } from "@sapphire/framework";
import { Message } from "discord.js";

export class PingCommand extends Command {
    public constructor(context: Command.Context, options: Command.Options) {
        super(context, {
            ...options,
            name: "ping",
            aliases: ["pong"],
            description: "ping pong",
        });
    }

    public override registerApplicationCommands(registry: ChatInputCommand.Registry) {
        registry.registerChatInputCommand(
            (builder) => {
                builder.setName("ping").setDescription("Ping Izuna to check her health.");
            },
            {
                idHints: ["1043209767402876938"],
            }
        );
    }

    public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
        const message = await interaction.reply({ content: "Ping?", ephemeral: true, fetchReply: true });
        if (message instanceof Message) {
            const diff = message.createdTimestamp - interaction.createdTimestamp;
            const ping = Math.round(this.container.client.ws.ping);
            return interaction.editReply(`Pong!!! Bot latency: ${ping}ms. API latency ${diff}ms.`);
        }

        return interaction.editReply("Failed to retrieve ping :(");
    }

    public override async messageRun(message: Message) {
        const msg = await message.channel.send("Ping?");
        const content = `Pong!!! Bot latency: ${Math.round(this.container.client.ws.ping)}ms. API latency ${
            msg.createdTimestamp - message.createdTimestamp
        }ms.`;
        return msg.edit(content);
    }
}
