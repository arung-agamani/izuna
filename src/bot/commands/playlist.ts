import { Args, Command } from "@sapphire/framework";
import type { Message } from "discord.js";
import type { Track } from "shoukaku";
import musicManager, { getShoukakuManager, MusicGuildInfo } from "../../lib/musicQueue";
import prisma from "../../lib/prisma";
import { fancyTimeFormat } from "../../lib/utils";
import logger from "../../lib/winston";

interface Playlist {
    userId: string;
    guildId: string;
    queue: Track[];
    dateCreated: Date;
    private: Boolean;
}

export class PlaylistMusicCommand extends Command {
    public constructor(context: Command.Context, options: Command.Options) {
        super(context, {
            ...options,
            name: "playlist",
            description: "Playlist utilities",
            flags: ["private", "p"],
        });
    }

    public async messageRun(message: Message, args: Args) {
        if (!message.guildId) {
            await message.channel.send("This command only works in servers");
            return;
        }
        if (!message.member?.voice.channel) {
            await message.channel.send("You must be in voice channel first.");
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
        let musicGuildInfo = musicManager.get(message.guildId!);
        if (!musicGuildInfo) {
            const player = await lavalinkNode.joinChannel({
                guildId: message.guildId,
                channelId: message.member.voice.channel.id,
                shardId: 0,
            });
            player.on("exception", (err) => {
                logger.error("Shoukaku player error");
                logger.error(err);
                if (err.error === "This video is not available") {
                    message.channel.send("Skipping the track. Reason: This video is not available :(");
                }
            });
            player.on("end", async (data) => {
                if (data.reason === "REPLACED") return;
                const currentMusicGuildInfo = musicManager.get(message.guildId!);
                if (!currentMusicGuildInfo) return;
                const newMusicGuildInfo = { ...currentMusicGuildInfo };
                if (newMusicGuildInfo.isSkippingQueued) {
                    newMusicGuildInfo.isSkippingQueued = false;
                    newMusicGuildInfo.currentPosition = newMusicGuildInfo.skipPosition;
                } else {
                    newMusicGuildInfo.currentPosition += 1;
                }
                newMusicGuildInfo.isPlaying = true;
                if (newMusicGuildInfo.currentPosition === newMusicGuildInfo.queue.length) {
                    await message.channel.send("Reached the end of playlist");
                    newMusicGuildInfo.isPlaying = false;
                    musicManager.set(message.guildId!, newMusicGuildInfo);
                    return;
                }
                await message.channel.send(
                    `Track loaded. ${newMusicGuildInfo.queue[newMusicGuildInfo.currentPosition]?.info.title} | Duration: ${fancyTimeFormat(
                        newMusicGuildInfo.queue[newMusicGuildInfo.currentPosition]?.info.length! / 1000
                    )}`
                );
                newMusicGuildInfo.player.playTrack({ track: newMusicGuildInfo.queue[newMusicGuildInfo.currentPosition]?.track! });
                newMusicGuildInfo.isPlaying = true;
                musicManager.set(message.guildId!, newMusicGuildInfo);
            });
            // put in manager
            let thisGuildInfo: MusicGuildInfo = {
                initiator: message.author.id,
                voiceChannel: message.member.voice.channel,
                currentPosition: 0, // 0-based indexing
                isRepeat: "no",
                isPlaying: false,
                isPausing: false,
                queue: [],
                player: player,
                isSkippingQueued: false,
                skipPosition: 0,
            };
            musicManager.set(message.guildId, thisGuildInfo);
            musicGuildInfo = thisGuildInfo;
        }
        try {
            const arg1 = await args.pick("string");
            if (arg1 === "save") {
                try {
                    const arg2 = await args.pick("string");
                    const isPrivate = args.getFlags("private", "p");
                    const playlist: Playlist = {
                        userId: message.author.id,
                        guildId: message.inGuild() ? message.guildId : "",
                        queue: [...musicGuildInfo.queue],
                        dateCreated: new Date(),
                        private: isPrivate,
                    };
                    const prevPlaylistInstance = await prisma.playlist.findFirst({
                        where: {
                            userId: message.author.id,
                            name: arg2,
                        },
                    });
                    // can be improved by using upsert, but eh... later
                    if (!prevPlaylistInstance) {
                        await prisma.playlist.create({
                            data: {
                                userId: playlist.userId,
                                guildId: playlist.guildId,
                                tracks: JSON.stringify(playlist.queue),
                                dateCreated: playlist.dateCreated,
                                name: arg2,
                                private: isPrivate,
                            },
                        });
                        await message.channel.send(`Playlist saved under the name **${arg2}**.`);
                    } else {
                        await prisma.playlist.update({
                            where: {
                                userId_name: {
                                    userId: message.author.id,
                                    name: arg2,
                                },
                            },
                            data: {
                                userId: playlist.userId,
                                guildId: playlist.guildId,
                                tracks: JSON.stringify(playlist.queue),
                                dateCreated: playlist.dateCreated,
                                name: arg2,
                            },
                        });
                        await message.channel.send(`Playlist updated under the name **${arg2}**.`);
                    }

                    return;
                } catch (error) {
                    await message.channel.send("Please give playlist name. Use simple name because it's what will be used for loading later on");
                    return;
                }
            } else if (arg1 === "load") {
                const arg2 = await args.pick("string");
                const isPrivate = args.getFlags("private", "p");
                let playlist = null;
                if (!isPrivate) {
                    playlist = await prisma.playlist.findFirst({
                        where: {
                            guildId: message.guildId,
                            name: arg2,
                            private: false,
                        },
                    });
                } else {
                    playlist = await prisma.playlist.findFirst({
                        where: {
                            userId: message.author.id,
                            name: arg2,
                            private: true,
                        },
                    });
                }
                if (!playlist) {
                    await message.channel.send(`There is no playlist with name **${arg2}**`);
                    return;
                }
                const tracks = JSON.parse(playlist.tracks as string) as unknown as Track[];
                musicGuildInfo.queue.push(...tracks);
                await message.channel.send(`Loaded playlist ${arg2} to current queue`);
                if (!musicGuildInfo.isPlaying) {
                    const poppedTrack = musicGuildInfo.queue[musicGuildInfo.currentPosition]!;
                    await musicGuildInfo.player.playTrack({ track: poppedTrack.track });
                    await message.channel.send(`Now playing **${poppedTrack.info.title}**, if it works...`);
                    musicGuildInfo.isPlaying = true;
                }
                return;
            } else if (arg1 === "info") {
                const arg2 = await args.pick("string");
                const isPrivate = args.getFlags("private", "p");
                let playlist = null;
                if (!isPrivate) {
                    playlist = await prisma.playlist.findFirst({
                        where: {
                            guildId: message.guildId,
                            name: arg2,
                            private: false,
                        },
                    });
                } else {
                    playlist = await prisma.playlist.findFirst({
                        where: {
                            userId: message.author.id,
                            name: arg2,
                            private: true,
                        },
                    });
                }
                if (!playlist) {
                    await message.channel.send(`There is no playlist with name **${arg2}**.`);
                    return;
                }
                let playlistInfo = `Track info for playlist **${arg2}**\n`;
                let i = 0;
                const tracks = JSON.parse(playlist.tracks as string) as unknown as Track[];
                for (const track of tracks) {
                    playlistInfo += `${i + 1}. ${track.info.title}. Duration ${fancyTimeFormat(track.info.length / 1000)}\n`;
                    i++;
                }
                await message.channel.send(playlistInfo);
                return;
            } else if (arg1 === "list") {
                let playlistsGuild: any[] = [];
                let playlistsPrivate = [];
                if (message.inGuild()) {
                    playlistsGuild = await prisma.playlist.findMany({
                        select: {
                            name: true,
                            private: true,
                        },
                        where: {
                            guildId: message.guildId,
                            private: false,
                        },
                    });
                }
                playlistsPrivate = await prisma.playlist.findMany({
                    select: {
                        name: true,
                        private: true,
                    },
                    where: {
                        userId: message.author.id,
                        private: true,
                    },
                });
                const playlists = playlistsGuild.concat(playlistsPrivate);
                if (playlists.length === 0) {
                    await message.channel.send(`There is no playlist for <@${message.author.id}>`);
                    return;
                }
                let playlistInfo = `Playlist registered for <@${message.author.id}>\n`;
                let i = 0;
                for (const playlist of playlists) {
                    playlistInfo += `${i + 1}. **${playlist.name}**${playlist.private ? " [private]" : ""}\n`;
                    i++;
                }
                await message.channel.send(playlistInfo);
                return;
            } else if (arg1 === "remove") {
                const arg2 = await args.pick("string");
                let playlist = null;
                if (message.inGuild()) {
                    playlist = await prisma.playlist.findFirst({
                        where: {
                            guildId: message.guildId,
                            name: arg2,
                        },
                    });
                } else {
                    playlist = await prisma.playlist.findFirst({
                        where: {
                            userId: message.author.id,
                            name: arg2,
                        },
                    });
                }
                if (!playlist) {
                    await message.channel.send(`There is no playlist with name **${arg2}**.`);
                    return;
                }
                await prisma.playlist.delete({
                    where: {
                        userId_name: {
                            userId: message.author.id,
                            name: arg2,
                        },
                    },
                });
                await message.reply(`Successfully deleted playlist **${arg2}**`);
                return;
            }
        } catch (error) {
            console.log(error);
            await message.channel.send("Please specify the operation. `save` or `load` or `info`");
            return;
        }
    }
}
