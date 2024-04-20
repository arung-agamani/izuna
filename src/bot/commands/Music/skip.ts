import { ChatInputCommand, Command } from "@sapphire/framework";
import type { Message, TextBasedChannel } from "discord.js";
import musicManager from "../../../lib/musicQueue";
import logger from "../../../lib/winston";
// import prisma from "../../lib/prisma";

export class SkipMusicCommand extends Command {
    public constructor(context: Command.Context, options: Command.Options) {
        super(context, {
            ...options,
            name: "skip",
            description: "Skip playing music",
            detailedDescription: `Skip currently playing track.
            If "jump" command is previously used, it will skip to the track targeted by the previous "jump" command.`,
        });
    }

    public override registerApplicationCommands(registry: ChatInputCommand.Registry) {
        registry.registerChatInputCommand((builder) => {
            builder.setName("skip").setDescription("Skip currently playing track");
        });
    }

    public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
        if (!interaction.guildId) {
            await interaction.channel?.send("This command only works in servers");
            return;
        }
        const ch = interaction.channel;
        if (!ch) {
            await interaction.channel!.send("Text channel is undefined. Hmm...");
            return;
        }
        const vc = interaction.guild?.members.cache.get(interaction.member!.user.id)?.voice.channel;
        if (!vc) {
            await ch.send("You must be in voice channel first.");
            return;
        }

        const guildId = interaction.guildId;
        await interaction.deferReply();
        await this.skip(guildId, ch);
        await interaction.followUp({ content: "Skip command complete", ephemeral: true });
    }

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
        const ch = message.channel;
        await this.skip(guildId, ch);
    }

    public async skip(guildId: string, textChannel: TextBasedChannel) {
        const musicGuildInfo = musicManager.get(guildId);
        if (!musicGuildInfo) {
            await textChannel.send("No bot in voice channel.");
            return;
        }
        if (musicGuildInfo.isPlaying) {
            await textChannel.send("Skipping the current trackt");
            await musicGuildInfo.player.stopTrack();
            musicGuildInfo.isPlaying = false;
            return;
        } else {
            await textChannel.send("No track to skip");
            return;
        }
    }
}
