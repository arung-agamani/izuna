import { ChatInputCommand, Command } from "@sapphire/framework";
import { Message, EmbedBuilder } from "discord.js";
import { google } from "googleapis";
import { closureGoogleOauthTracker } from "../../lib/google";
import prisma from "../../lib/prisma";
import { getMusicManager, getShoukakuManager } from "../../lib/musicQueue";
import { serialize } from "serializr";

export class TestCommand extends Command {
    public constructor(context: Command.Context, options: Command.Options) {
        super(context, {
            ...options,
            name: "test",
            description: "test sandbox",
        });
    }

    public override registerApplicationCommands(registry: ChatInputCommand.Registry) {
        registry.registerChatInputCommand(
            (builder) => {
                builder
                    .setName("test")
                    .setDescription("A test playground")
                    .addStringOption((opt) => opt.setName("echo").setDescription("Message to echo").setRequired(true));
            },
            {
                idHints: ["1043216731168051241"],
                guildIds: ["339763195554299904"],
            }
        );
    }

    public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
        const message = interaction.options.getString("echo", true);
        const embed = new EmbedBuilder();
        embed.setTitle("Howling Blog").setURL("https://blog.howlingmoon.dev");
        embed.setDescription(`Howling Blog is a website created by Closure's author.
        It contains many good things, ||and also weeb things||.
        Did you know that Closure's repo is called [izuna](https://github.com/arung-agamani/izuna)?
        ||It's also a secret that Closure's author has art account over [twitter](https://twitter.com/shirayuk1haruka)`);
        return interaction.reply({
            content: message,
            embeds: [embed],
        });
    }

    public override async messageRun(message: Message) {
        const manager = getShoukakuManager();
        const musicManager = getMusicManager();
        if (!manager) {
            console.log("No shoukaku manager found");
            process.exit(0);
        }
        for (const connectedGuild of musicManager.values()) {
            console.log(`Processing cleanup on guild connection ${connectedGuild.player.guildId}`);
            try {
                const player = connectedGuild.player;
                const playerData = player.data;
                const connectionData = connectedGuild.player.node.manager.connections.get(playerData.guildId)!;
                console.log("Pre write", {
                    guildId: connectedGuild.player.guildId,
                    sessionId: "",
                    connectionData: "",
                    playerData: "",
                });
                const p = await prisma.playerSession.upsert({
                    where: {
                        guildId: playerData.guildId,
                    },
                    create: {
                        guildId: playerData.guildId,
                        sessionId: playerData.playerOptions.voice?.sessionId,
                        connectionData: serialize(connectedGuild),
                        playerData: JSON.stringify(playerData),
                    },
                    update: {
                        sessionId: playerData.playerOptions.voice?.sessionId,
                        connectionData: serialize(connectedGuild),
                        playerData: JSON.stringify(playerData),
                    },
                });
                console.log("Post write haha");
                await message.channel.send(`Saving ${playerData.guildId}`);
            } catch (error) {
                console.log("Error happened when saving player data");
                console.log(error);
            }
        }
        await message.channel.send("Executing test");
    }
}
