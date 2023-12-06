import { ChatInputCommand, Command } from "@sapphire/framework";
import { Message, TextBasedChannel, VoiceBasedChannel } from "discord.js";
import musicManager from "../../../lib/musicQueue";

export class NtrCommand extends Command {
    public constructor(context: Command.Context, options: Command.Options) {
        super(context, {
            ...options,
            name: "vcmove",
            aliases: ["cmere", "come", "ntr"],
            description: "Forcefully pulling the bot into voice channel you're in now.",
            detailedDescription:
                "An albeit weird naming, but it does the job.\nIf the bot is currently playing something in some other voice channel, it will be pulled into the voice channel you're currently in. Otherwise will do nothing if you're not even in any voice channel.",
        });
    }

    public override registerApplicationCommands(registry: ChatInputCommand.Registry) {
        registry.registerChatInputCommand((builder) => {
            builder.setName("ntr").setDescription("Pull the music player into your voice channel forcefully");
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
        await this.ntr(guildId, textChannel, voiceChannel);
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
        const voiceChannel = message.member.voice.channel;

        await this.ntr(guildId, textChannel, voiceChannel);
    }

    public async ntr(guildId: string, textChannel: TextBasedChannel, userVoiceChannel: VoiceBasedChannel) {
        const musicGuildInfo = musicManager.get(guildId);
        if (!musicGuildInfo) {
            await textChannel.send("No bot in voice channel. Are you okay?");
            return;
        }
        const client = this.container.client;
        const guild = client.guilds.cache.get(guildId)!;
        if (!guild) {
            await textChannel.send("Somehow the guild object is empty. Debug this");
            return;
        }
        const botUser = guild.members.cache.get(client.id!);
        if (!botUser) {
            await textChannel.send("Bot user not found.... wtf, then who am i?");
            return;
        }
        botUser.voice.setChannel(userVoiceChannel);
        musicGuildInfo.voiceChannel = userVoiceChannel;
        await textChannel.send("Yes, yes, I'm coming!");
        return;
    }
}
