import { ChatInputCommand, Command } from "@sapphire/framework";
import type { Message, TextBasedChannel } from "discord.js";
import musicManager from "../../../lib/musicQueue";
import logger from "../../../lib/winston";
// import prisma from "../../lib/prisma";

export class PauseMusicCommand extends Command {
    public constructor(context: Command.Context, options: Command.Options) {
        super(context, {
            ...options,
            name: "pause",
            aliases: ["continue", "resume"],
            description: "Pause/continue playing music",
            detailedDescription: `This command pause and resumes the currently playing music player in a server
            It acts as simple toggle that will change the state to the opposite state.
            It's... as straightforward is it could be.
            But this won't make the player play if player reached the end of playlist and thus stopped.
            You'll need to use the jump command. There might be plan to implement said feature in future.`,
        });
    }

    public override registerApplicationCommands(registry: ChatInputCommand.Registry) {
        registry.registerChatInputCommand((builder) => {
            builder.setName("pause").setDescription("Pause/Resume currently playing track");
        });
    }

    public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
        if (!interaction.guildId) {
            await interaction.channel?.send("This command only works in servers");
            return;
        }
        const textChannel = interaction.channel;
        if (!textChannel) {
            await interaction.channel!.send("Text channel is undefined. This issue has been reported (should be)");
            return;
        }
        const voiceChannel = interaction.guild?.members.cache.get(interaction.member!.user.id)?.voice.channel;
        if (!voiceChannel) {
            await interaction.channel?.send("You must be in voice channel first.");
            return;
        }
        const guildId = interaction.guildId;
        await interaction.deferReply();
        await this.pause(guildId, textChannel);
        await interaction.followUp({ content: "Pause command complete", ephemeral: true });
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
        const textChannel = message.channel;

        await this.pause(guildId, textChannel);
    }

    public async pause(guildId: string, textChannel: TextBasedChannel) {
        const musicGuildInfo = musicManager.get(guildId);
        if (!musicGuildInfo) {
            await textChannel.send("No bot in voice channel. Are you okay?");
            return;
        }
        musicGuildInfo.player.setPaused(!musicGuildInfo.isPausing);
        musicGuildInfo.isPausing = !musicGuildInfo.isPausing;
        await textChannel.send(musicGuildInfo.player.paused ? "Pausing..." : "Resuming...");
        return;
    }
}
