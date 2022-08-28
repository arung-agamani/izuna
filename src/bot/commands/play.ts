import { Args, Command } from "@sapphire/framework";
import type { Message } from "discord.js";
import musicManager, { MusicGuildInfo, getShoukakuManager } from "../../lib/musicQueue";
import logger from "../../lib/winston";

type LavalinkLoadType = "TRACK_LOADED" | "PLAYLIST_LOADED" | "SEARCH_RESULT" | "NO_MATCHES" | "LOAD_FAILED";

const youtubeVideoRegex = /^((?:https?:)?\/\/)?((?:www|m)\.)?((?:youtube\.com|youtu.be))(\/(?:[\w\-]+\?v=|embed\/|v\/)?)([\w\-]+)(\S+)?$/gm;
const youtubePlaylistRegex = /(?:https?:\/\/)?(?:youtu\.be\/|(?:www\.|m\.)?youtube\.com\/(?:playlist|list|embed)(?:\.php)?(?:\?.*list=|\/))([a-zA-Z0-9\-_]+)/gm;

// taken from https://stackoverflow.com/a/11486026
function fancyTimeFormat(duration: number) {
    // Hours, minutes and seconds
    var hrs = ~~(duration / 3600);
    var mins = ~~((duration % 3600) / 60);
    var secs = ~~duration % 60;

    // Output like "1:01" or "4:03:59" or "123:03:59"
    var ret = "";

    if (hrs > 0) {
        ret += "" + hrs + ":" + (mins < 10 ? "0" : "");
    }

    ret += "" + mins + ":" + (secs < 10 ? "0" : "");
    ret += "" + secs;
    return ret;
}
export class PlayMusicCommand extends Command {
    public constructor(context: Command.Context, options: Command.Options) {
        super(context, {
            ...options,
            name: "play",
            description: "Plays music",
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
        // search the stuff
        const searchQuery = await args.rest("string");
        // is youtube video?
        const youtubeRegexRes = youtubeVideoRegex.exec(searchQuery);
        const youtubePlaylistRes = youtubePlaylistRegex.exec(searchQuery);
        let videoId = "";
        let playlistId = "";
        if (youtubeRegexRes && youtubeRegexRes[5]) {
            videoId = youtubeRegexRes[5];
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

        let searchRes;
        if (youtubePlaylistRes) {
            searchRes = await lavalinkNode.rest.resolve(playlistId);
        } else if (youtubeRegexRes) {
            searchRes = await lavalinkNode.rest.resolve(videoId);
        } else {
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
                queue: [],
                player: player,
                isSkippingQueued: false,
                skipPosition: 0,
            };
            musicManager.set(message.guildId, thisGuildInfo);
            musicGuildInfo = thisGuildInfo;
        }
        switch (searchRes.loadType as LavalinkLoadType) {
            case "TRACK_LOADED":
                musicGuildInfo?.queue.push(searchRes.tracks[0]!);
                await message.channel.send(
                    `Track loaded. ${searchRes.tracks[0]?.info.title} | Duration: ${fancyTimeFormat(searchRes.tracks[0]?.info.length! / 1000)}`
                );
                break;
            case "PLAYLIST_LOADED":
                const tracks = searchRes.tracks;
                musicGuildInfo?.queue.push(...tracks);
                let msg = "";
                for (const track of tracks) {
                    msg += `Track loaded. ${track.info.title} | Duration: ${track.info.length}\n`;
                }
                await message.channel.send(msg);
                break;
            case "SEARCH_RESULT":
                musicGuildInfo?.queue.push(searchRes.tracks[0]!);
                await message.channel.send("Search result for: " + searchQuery);
                await message.channel.send(
                    `Track loaded. **${searchRes.tracks[0]?.info.title}** | Duration: ${fancyTimeFormat(searchRes.tracks[0]?.info.length! / 1000)}`
                );
                break;
            case "NO_MATCHES":
                await message.channel.send("No result found... Hmm...");
                return;
        }
        // play the head
        if (!musicGuildInfo.isPlaying) {
            const poppedTrack = musicGuildInfo.queue[musicGuildInfo.currentPosition]!;
            await musicGuildInfo.player.playTrack({ track: poppedTrack.track });
            await message.channel.send(`Now playing **${poppedTrack.info.title}**, if it works...`);
            musicGuildInfo.isPlaying = true;
        }
    }
}
