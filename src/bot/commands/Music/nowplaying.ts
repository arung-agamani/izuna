import { Command } from "@sapphire/framework";
import { Formatters, Message } from "discord.js";
import { MessageEmbed } from "discord.js";
import musicManager, { getShoukakuManager } from "../../../lib/musicQueue";
import { fancyTimeFormat } from "../../../lib/utils";
// import prisma from "../../lib/prisma";
import { PaginatedMessage } from "@sapphire/discord.js-utilities";
export class NowPlayingMusicCommand extends Command {
    public constructor(context: Command.Context, options: Command.Options) {
        super(context, {
            ...options,
            name: "nowplaying",
            aliases: ["np", "queue", "q"],
            description: "Show now playing and queue",
        });
    }

    public async messageRun(message: Message) {
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
        const lavalinkNode = shoukakuManager.getNode();
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
            const page = new MessageEmbed();
            page.setTitle("Now playing queue...");
            let msg = "";
            for (const track of queue) {
                msg += `${i + 1}. ${track.info.title} - Duration ${fancyTimeFormat(track.info.length! / 1000)}\n`;
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
        const embedMessage = new MessageEmbed();
        const currentTrack = musicGuildInfo.queue[musicGuildInfo.currentPosition];
        const npString = `${fancyTimeFormat(musicGuildInfo.player.position / 1000)} / ${fancyTimeFormat(currentTrack?.info.length! / 1000)}`;
        embedMessage.setTitle("Closure: Now Playing...");
        // embedMessage.setThumbnail(currentTrack?.info.uri!)
        // embedMessage.setURL(currentTrack?.info.uri!)
        embedMessage.addField(currentTrack?.info.title!, currentTrack?.info.uri!);
        embedMessage.addField("Position", npString);
        let currentPage = Math.floor(musicGuildInfo.currentPosition / 10);
        paginatedMessage.setIndex(currentPage);
        paginatedMessage.setWrongUserInteractionReply((targetUser) => ({
            content: `Even if you fiddle with my buttons, my heart belongs to ${Formatters.userMention(targetUser.id)}-sama alone.`,
            ephemeral: true,
            allowedMentions: {
                users: [],
                roles: [],
            },
        }));
        await message.channel.send({ embeds: [embedMessage] });
        await paginatedMessage.run(message);
        return;
    }
}