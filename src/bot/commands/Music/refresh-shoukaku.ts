import { ChatInputCommand, Command } from "@sapphire/framework";
import type { Message, TextBasedChannel } from "discord.js";
import musicManager, { getShoukakuManager } from "../../../lib/musicQueue";
import logger from "../../../lib/winston";
import { config } from "../../../config";
import { NodeOption } from "shoukaku";
import fetch from "node-fetch";
// import prisma from "../../lib/prisma";

export class PauseMusicCommand extends Command {
    public constructor(context: Command.Context, options: Command.Options) {
        super(context, {
            ...options,
            name: "refresh-player",
            description: "Refresh the music nodes Shoukaku (Lavalink client) uses",
            detailedDescription: `This command purges all lavalink nodes, re-add nodes from config, and reinitialize connection.
            This command basically refreshes the connection.`,
        });
    }

    // public override registerApplicationCommands(registry: ChatInputCommand.Registry) {
    //     registry.registerChatInputCommand(
    //         (builder) => {
    //             builder.setName("pause").setDescription("Pause/Resume currently playing track");
    //         },
    //         { idHints: ["1194230014053470278"] }
    //     );
    // }

    // public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    //     if (!interaction.guildId) {
    //         await interaction.channel?.send("This command only works in servers");
    //         return;
    //     }
    //     const textChannel = interaction.channel;
    //     if (!textChannel) {
    //         await interaction.channel!.send("Text channel is undefined. This issue has been reported (should be)");
    //         return;
    //     }
    //     const voiceChannel = interaction.guild?.members.cache.get(interaction.member!.user.id)?.voice.channel;
    //     if (!voiceChannel) {
    //         await interaction.channel?.send("You must be in voice channel first.");
    //         return;
    //     }
    //     const guildId = interaction.guildId;
    //     await interaction.deferReply();
    //     await this.pause(guildId, textChannel);
    //     await interaction.followUp({ content: "Pause command complete", ephemeral: true });
    // }

    public override async messageRun(message: Message) {
        if (!message.guildId) {
            await message.channel.send("This command only works in servers");
            return;
        }
        if (!message.member?.voice.channel) {
            await message.channel.send("You must be in voice channel first.");
            return;
        }
        const guildId = message.guildId;
        const textChannel = message.channel;

        await this.refresh(guildId, textChannel);
    }

    public async refresh(guildId: string, textChannel: TextBasedChannel) {
        const shoukaku = getShoukakuManager();
        if (!shoukaku) {
            await textChannel.send("Uninitialized shoukaku client. Is this even possible?");
            return;
        }
        const musicGuildInfo = musicManager.get(guildId!);
        if (musicGuildInfo) {
            await musicGuildInfo.player.stopTrack();
        }
        await shoukaku.leaveVoiceChannel(guildId);
        musicManager.delete(guildId);
        const nodes: NodeOption[] = [];
        const lavalinkNodeConfig = await fetch(config.lavalinkConfigPath).then((res) => res.json()) as any;
        for (const node of lavalinkNodeConfig) {
            logger.info(`Added ${node.name} to lavalink node pool`);
            nodes.push(node);
        }
        await textChannel.send(`Fetched node list. Retrieved node count: ${nodes.length}`);
        for (const node of shoukaku.nodes) {
            shoukaku.removeNode(node[0]);
        }
        await textChannel.send("Removed all currently attached nodes");
        for (const node of nodes) {
            shoukaku.addNode(node);
        }
        await textChannel.send("Reattached nodes. Try queueing for music again.");
        return;
    }
}
