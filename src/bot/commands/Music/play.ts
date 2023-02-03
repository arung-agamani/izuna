import { Args, Command } from "@sapphire/framework";
import type { Message } from "discord.js";
import { HttpUrlRegex } from "@sapphire/discord-utilities";
import musicManager, { MusicGuildInfo, getShoukakuManager, LavalinkLoadType, LavalinkLazyLoad } from "../../../lib/musicQueue";
import logger from "../../../lib/winston";
import { fancyTimeFormat } from "../../../lib/utils";
import { getGoogleClient } from "../../../lib/google";
import { LavalinkResponse, Track } from "shoukaku";

const youtubeVideoRegex = /^((?:https?:)?\/\/)?((?:www|m)\.)?((?:youtube\.com|youtu.be))(\/(?:[\w\-]+\?v=|embed\/|v\/)?)([\w\-]+)(\S+)?$/;
const youtubePlaylistRegex = /(?:https?:\/\/)?(?:youtu\.be\/|(?:www\.|m\.)?youtube\.com\/(?:playlist|list|embed)(?:\.php)?(?:\?.*list=|\/))([a-zA-Z0-9\-_]+)/;
const driveRegex = /\/file\/d\/([^\/]+)/;
const hmsRegex = /[hms]+/g;
const timestampRegex = /\&t=([0-9A-Za-z]+)/;

// comm : r.exec("https://www.youtube.com/watch?v=9eB1Tp8Li-c&t=17m39s")[1].replaceAll(hms2,":").split(":").slice(0, -1).reverse().reduce((acc, curr, idx) => acc + Number(curr)*Math.pow(60,idx), 0)
export class PlayMusicCommand extends Command {
    public constructor(context: Command.Context, options: Command.Options) {
        super(context, {
            ...options,
            name: "play",
            flags: ["s", "seek"],
            description: "Plays music",
        });
    }

    public override async messageRun(message: Message, args: Args) {
        logger.debug("Entire message: " + message.content);
        if (!message.guildId) {
            await message.channel.send("This command only works in servers");
            return;
        }
        if (!message.member?.voice.channel) {
            await message.channel.send("You must be in voice channel first.");
            return;
        }
        // search the stuff
        const isSeeking = args.getFlags("s", "seek");
        const searchQuery = await args.rest("string");
        if (isSeeking) {
            logger.debug("Seeking is active for input string: " + searchQuery);
        } else {
            logger.debug("NOT ACTIVE");
        }
        // is youtube video?
        const youtubeRegexRes = youtubeVideoRegex.exec(searchQuery);
        const youtubePlaylistRes = youtubePlaylistRegex.exec(searchQuery);
        let videoId = "";
        let playlistId = "";
        let targetTimestamp = 0;
        if (youtubeRegexRes && youtubeRegexRes[5]) {
            logger.debug("Is inside youtubeRegexRes=true");
            videoId = youtubeRegexRes[5];
            if (isSeeking) {
                targetTimestamp = timestampRegex
                    .exec(searchQuery)![1]!
                    .replaceAll(hmsRegex, ":")
                    .split(":")
                    .slice(0, -1)
                    .reverse()
                    .reduce((acc, curr, idx) => acc + Number(curr) * Math.pow(60, idx), 0);
                logger.debug("Timestamp set to " + targetTimestamp);
            }
        }
        if (youtubePlaylistRes && youtubePlaylistRes[1]) {
            playlistId = youtubePlaylistRes[1];
        }
        if (searchQuery === "") {
            await message.channel.send("Please put in something to search");
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

        let searchRes: LavalinkResponse | LavalinkLazyLoad | null;
        if (youtubePlaylistRes) {
            searchRes = await lavalinkNode.rest.resolve(playlistId);
        } else if (youtubeRegexRes) {
            searchRes = await lavalinkNode.rest.resolve(videoId);
            if (isSeeking) {
                searchRes!.tracks[0]!.info.position = targetTimestamp * 1000;
                logger.debug(`Search set with seeking flag. Timestamp : ${targetTimestamp}`);
                logger.debug(`searchRes.tracks[0].info.position = ${searchRes!.tracks[0]!.info.position}`);
            }
        } else if (driveRegex.exec(searchQuery)) {
            const fileId = driveRegex.exec(searchQuery)![1]!;
            const drive = getGoogleClient();
            const file = await drive.files.get({
                fileId,
            });
            // searchRes = await lavalinkNode.rest.resolve(file.data.webContentLink!);
            // await message.channel.send(
            //     "**[Warning]** That looks like a Google Drive link.\nThis feature is currently unstable and you might encounter unplayable track case (especially after track finish).\nIn case of unplayable track, please requeue the track and delete old unplayable track."
            // );
            searchRes = {
                loadType: "LAZY_LOAD_GDRIVE",
                fileId,
                info: {
                    title: file.data.name!,
                    length: -1,
                    uri: searchQuery,
                },
            };
        } else if (HttpUrlRegex.exec(searchQuery)) {
            logger.debug("Is inside HttpUrlRegex=true, line 106");
            searchRes = await lavalinkNode.rest.resolve(searchQuery);
        } else {
            logger.debug("Is inside standard ytsearch=true, line 109");
            searchRes = await lavalinkNode.rest.resolve(`ytsearch: ${searchQuery}`);
        }

        if ((searchRes?.loadType as LavalinkLoadType) === "LOAD_FAILED" || !searchRes) {
            await message.channel.send("Failed to search that query. Try with different formatting, I guess?");
            return;
        }
        let musicGuildInfo = musicManager.get(message.guildId);
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
                    if (newMusicGuildInfo.isRepeat !== "single") {
                        newMusicGuildInfo.currentPosition += 1;
                    }
                }
                newMusicGuildInfo.isPlaying = true;
                if (newMusicGuildInfo.currentPosition === newMusicGuildInfo.queue.length) {
                    await message.channel.send("Reached the end of playlist");
                    if (newMusicGuildInfo.isRepeat === "playlist") {
                        newMusicGuildInfo.currentPosition = 0;
                        await message.channel.send("Playlist loop is set. Resetting playhead to the beginning of the queue.");
                        let poppedTrack = newMusicGuildInfo.queue[newMusicGuildInfo.currentPosition]!;
                        if ((<LavalinkLazyLoad>poppedTrack).fileId) {
                            const searchTarget = await this.resolveGoogleDrive((<LavalinkLazyLoad>poppedTrack).fileId);
                            if (!searchTarget) {
                                await message.channel.send("Failed to query from Google Drive");
                                return;
                            }
                            let newPoppedTrack = await lavalinkNode.rest.resolve(searchTarget!);
                            if (!newPoppedTrack) {
                                await message.channel.send("Failed to resolve WebContentLink as Playable Track");
                                return;
                            }
                            await newMusicGuildInfo.player.playTrack({
                                track: newPoppedTrack.tracks[0].track,
                            });
                            await message.channel.send(`Now playing **${newPoppedTrack.tracks[0].info.title}**, if it works...`);
                            newMusicGuildInfo.isPlaying = true;
                        } else {
                            poppedTrack = poppedTrack as Track;
                            await newMusicGuildInfo.player.playTrack({
                                track: poppedTrack.track,
                                options: {
                                    startTime: poppedTrack.info.position,
                                },
                            });
                            await message.channel.send(`Now playing **${poppedTrack.info.title}**, if it works...`);
                            newMusicGuildInfo.isPlaying = true;
                        }
                    } else {
                        newMusicGuildInfo.isPlaying = false;
                    }
                    musicManager.set(message.guildId!, newMusicGuildInfo);
                    return;
                }

                // play the track or smth
                let currentTrack = newMusicGuildInfo.queue[newMusicGuildInfo.currentPosition];
                if ((<LavalinkLazyLoad>currentTrack).fileId) {
                    currentTrack = currentTrack as LavalinkLazyLoad;
                    const searchTarget = await this.resolveGoogleDrive(currentTrack.fileId);
                    if (!searchTarget) {
                        await message.channel.send("Failed to query from Google Drive");
                        return;
                    }
                    let newPoppedTrack = await lavalinkNode.rest.resolve(searchTarget!);
                    if (!newPoppedTrack) {
                        await message.channel.send("Failed to resolve WebContentLink as Playable Track");
                        return;
                    }
                    await newMusicGuildInfo.player.playTrack({
                        track: newPoppedTrack.tracks[0].track,
                    });
                    await message.channel.send(`Now playing **${newPoppedTrack.tracks[0].info.title}**, if it works...`);
                    newMusicGuildInfo.isPlaying = true;
                } else {
                    currentTrack = currentTrack as Track;
                    await message.channel.send(`Track loaded. ${currentTrack.info.title} | Duration: ${fancyTimeFormat(currentTrack.info.length! / 1000)}`);
                    newMusicGuildInfo.player.playTrack({
                        track: currentTrack.track!,
                        options: {
                            startTime: currentTrack.info.position!,
                        },
                    });
                }

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
        switch (searchRes.loadType as LavalinkLoadType) {
            case "LAZY_LOAD_GDRIVE":
                searchRes = searchRes as LavalinkLazyLoad;
                musicGuildInfo.queue.push(searchRes);
                await message.channel.send(
                    `Track loaded. ${searchRes.info.title} | Pos: ${musicGuildInfo.queue.length}\nThis track will be lazy-loaded on it's turn.`
                );
                break;
            case "TRACK_LOADED":
                searchRes = searchRes as LavalinkResponse;
                logger.debug(`LoadType: ${searchRes.loadType} for query ${searchQuery}`);
                musicGuildInfo?.queue.push(searchRes.tracks[0]!);
                await message.channel.send(
                    `Track loaded. ${searchRes.tracks[0]?.info.title} | Duration: ${fancyTimeFormat(searchRes.tracks[0]?.info.length! / 1000)} | Pos: ${
                        musicGuildInfo.queue.length
                    }. | Timestamp: ${fancyTimeFormat(searchRes.tracks[0]!.info.position / 1000)}`
                );
                break;
            case "PLAYLIST_LOADED":
                searchRes = searchRes as LavalinkResponse;
                logger.debug(`LoadType: ${searchRes.loadType} for query ${searchQuery}`);
                const tracks = searchRes.tracks;
                musicGuildInfo?.queue.push(...tracks);
                let msg = "";
                for (const track of tracks) {
                    msg += `Track loaded. ${track.info.title} | Duration: ${track.info.length}\n`;
                }
                await message.channel.send(msg);
                break;
            case "SEARCH_RESULT":
                searchRes = searchRes as LavalinkResponse;
                logger.debug(`LoadType: ${searchRes.loadType} for query ${searchQuery}`);
                musicGuildInfo?.queue.push(searchRes.tracks[0]!);
                await message.channel.send("Search result for: " + searchQuery);
                await message.channel.send(
                    `Track loaded. **${searchRes.tracks[0]?.info.title}** | Duration: ${fancyTimeFormat(searchRes.tracks[0]?.info.length! / 1000)} | Pos: ${
                        musicGuildInfo.queue.length
                    }`
                );
                break;
            case "NO_MATCHES":
                logger.debug(`LoadType: ${searchRes.loadType} for query ${searchQuery}`);
                await message.channel.send("No result found... Hmm...");
                return;
        }
        // play the head
        if (!musicGuildInfo.isPlaying) {
            let poppedTrack = musicGuildInfo.queue[musicGuildInfo.currentPosition]!;
            if ((<LavalinkLazyLoad>poppedTrack).fileId) {
                const searchTarget = await this.resolveGoogleDrive((<LavalinkLazyLoad>poppedTrack).fileId);
                if (!searchTarget) {
                    await message.channel.send("Failed to query from Google Drive");
                    return;
                }
                let newPoppedTrack = await lavalinkNode.rest.resolve(searchTarget!);
                if (!newPoppedTrack) {
                    await message.channel.send("Failed to resolve WebContentLink as Playable Track");
                    return;
                }
                await musicGuildInfo.player.playTrack({
                    track: newPoppedTrack.tracks[0].track,
                });
                await message.channel.send(`Now playing **${newPoppedTrack.tracks[0].info.title}**, if it works...`);
                musicGuildInfo.isPlaying = true;
            } else {
                poppedTrack = poppedTrack as Track;
                await musicGuildInfo.player.playTrack({
                    track: poppedTrack.track,
                    options: {
                        startTime: poppedTrack.info.position,
                    },
                });
                await message.channel.send(`Now playing **${poppedTrack.info.title}**, if it works...`);
                musicGuildInfo.isPlaying = true;
            }
        }
    }

    async resolveGoogleDrive(fileId: string) {
        const drive = getGoogleClient();
        const file = await drive.files.get({
            fileId,
            fields: "webContentLink",
        });
        return file.data.webContentLink;
    }
}
