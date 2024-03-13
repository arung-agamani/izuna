import { Command } from "@sapphire/framework";
import { Message, userMention } from "discord.js";
import { EmbedBuilder } from "discord.js";
import musicManager, { getShoukakuManager } from "../../../lib/musicQueue";
import { fancyTimeFormat } from "../../../lib/utils";
// import prisma from "../../lib/prisma";
import { PaginatedMessage } from "@sapphire/discord.js-utilities";
import logger from "../../../lib/winston";
export class NowPlayingMusicCommand extends Command {
    public constructor(context: Command.Context, options: Command.Options) {
        super(context, {
            ...options,
            name: "nowplaying",
            aliases: ["np", "queue", "q"],
            description: "Show now playing and queue",
            detailedDescription: `Showing the now playing track and it's detailed information as well as the playlist.
            It's as straightforward as it could be.`,
        });
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
        const musicGuildInfo = musicManager.get(message.guildId!);
        if (!musicGuildInfo) {
            await message.channel.send("No bot in voice channel. Are you okay?");
            return;
        }
        const shoukakuManager = getShoukakuManager();
        if (!shoukakuManager) {
            await message.channel.send("Music manager uninitizalied. Check your implementation, dumbass");
            return;
        }
        // @ts-ignore
        const lavalinkNode = shoukakuManager.options.nodeResolver(shoukakuManager.nodes);
        if (!lavalinkNode) {
            await message.channel.send("No music player node currently connected.");
            return;
        }
        if (musicGuildInfo.queue.length === 0) {
            await message.channel.send("No item in queue");
            return;
        }
        // check if there is a current playing track
        const queue = musicGuildInfo.queue;
        const paginatedMessage = new PaginatedMessage();
        let i = 0;
        if (queue.length < 10) {
            const page = new EmbedBuilder();
            page.setTitle("Now playing queue...");
            let msg = "";
            for (let j = 0; j < queue.length; j++) {
                if (musicGuildInfo.currentPosition === i) {
                    msg += `**${i + 1}. ${queue[i]?.info.title} - Duration ${fancyTimeFormat(queue[i]?.info.length! / 1000)}**\n`;
                } else {
                    msg += `${i + 1}. ${queue[i]?.info.title} - Duration ${fancyTimeFormat(queue[i]?.info.length! / 1000)}\n`;
                }
                i++;
            }
            page.setDescription(msg);
            paginatedMessage.addPageEmbed((embed) => {
                embed.setTitle("Now playing queue...");
                embed.setDescription(msg);
                return embed;
            });
        } else {
            let totalPages = Math.ceil(queue.length / 10);
            let pageCounter = 0;
            while (pageCounter < totalPages) {
                let msg = "";
                // console.log(pageCounter);
                if (pageCounter < totalPages - 1) {
                    for (let j = 0; j < 10; j++) {
                        if (musicGuildInfo.currentPosition === i) {
                            msg += `**${i + 1}. ${queue[i]?.info.title} - Duration ${fancyTimeFormat(queue[i]?.info.length! / 1000)}**\n`;
                        } else {
                            msg += `${i + 1}. ${queue[i]?.info.title} - Duration ${fancyTimeFormat(queue[i]?.info.length! / 1000)}\n`;
                        }
                        i++;
                    }
                    paginatedMessage.addPageEmbed((embed) => {
                        embed.setTitle("Now playing queue...");
                        embed.setDescription(msg);
                        return embed;
                    });
                    pageCounter++;
                } else {
                    for (let j = i; j < queue.length; j++) {
                        if (musicGuildInfo.currentPosition === i) {
                            msg += `**${i + 1}. ${queue[i]?.info.title} - Duration ${fancyTimeFormat(queue[i]?.info.length! / 1000)}**\n`;
                        } else {
                            msg += `${i + 1}. ${queue[i]?.info.title} - Duration ${fancyTimeFormat(queue[i]?.info.length! / 1000)}\n`;
                        }
                        i++;
                    }
                    paginatedMessage.addPageEmbed((embed) => {
                        embed.setTitle("Now playing queue...");
                        embed.setDescription(msg);
                        return embed;
                    });
                    pageCounter++;
                }
            }
        }
        const embedMessage = new EmbedBuilder();
        const currentTrack = musicGuildInfo.queue[musicGuildInfo.currentPosition];
        const npString = `${fancyTimeFormat(musicGuildInfo.player.position / 1000)} / ${fancyTimeFormat(currentTrack?.info.length! / 1000)}`;
        if (musicGuildInfo.isPlaying) {
            embedMessage.setTitle("Izuna: Now Playing...");
            embedMessage.addFields({ name: currentTrack?.info.title!, value: currentTrack?.info.uri! });
            embedMessage.addFields({ name: "Position", value: npString });
            const estimatedToDone =
                musicGuildInfo.queue.slice(musicGuildInfo.currentPosition).reduce((acc, val) => acc + val.info.length, 0) / 1000 -
                musicGuildInfo.player.position / 1000;
            embedMessage.addFields({ name: "Estimated Playlist Time Left", value: fancyTimeFormat(estimatedToDone) });
            // embedMessage.addFields({ name: "State-ispausing", value: String(musicGuildInfo.isPausing) });
            // embedMessage.addFields({ name: "State-isplaying", value: String(musicGuildInfo.isPlaying) });
            // embedMessage.addFields({ name: "State-isskippingqueued", value: String(musicGuildInfo.isSkippingQueued) });
            // embedMessage.addFields({ name: "State-isrepeat", value: String(musicGuildInfo.isRepeat) });
            await message.channel.send({ embeds: [embedMessage] });
        }
        let currentPage = Math.floor(musicGuildInfo.currentPosition / 10);
        paginatedMessage.setIndex(currentPage);
        paginatedMessage.setWrongUserInteractionReply((targetUser) => ({
            content: `Even if you fiddle with my buttons, my heart belongs to ${userMention(targetUser.id)}-sama alone.`,
            ephemeral: true,
            allowedMentions: {
                users: [],
                roles: [],
            },
        }));
        await paginatedMessage.run(message);
        return;
    }
}
