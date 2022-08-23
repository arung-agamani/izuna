import { Args, Command } from "@sapphire/framework";
import type { Message } from "discord.js";
import musicManager, { MusicGuildInfo, getShoukakuManager } from "../../lib/musicQueue";
import logger from "../../lib/winston";

type LavalinkLoadType = "TRACK_LOADED" | "PLAYLIST_LOADED" | "SEARCH_RESULT" | "NO_MATCHES" | "LOAD_FAILED";
// interface LavalinkLoadTracksRes {
//     loadType: "TRACK_LOADED" | "PLAYLIST_LOADED" | "SEARCH_RESULT" | "NO_MATCHES" | "LOAD_FAILED";
// }

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
        const searchRes = await lavalinkNode.rest.resolve(`ytsearch: ${searchQuery}`);

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
                if (err.error === "Thi video is not available") {
                    message.channel.send("Skipping the track. Reason: This video is not available :(");
                }
            });
            player.on("end", async (data) => {
                if (data.reason === "REPLACED") return;
                const currentMusicGuildInfo = musicManager.get(message.guildId!);
                if (!currentMusicGuildInfo) return;
                const newMusicGuildInfo = { ...currentMusicGuildInfo };
                newMusicGuildInfo.currentPosition += 1;
                newMusicGuildInfo.isPlaying = true;
                if (newMusicGuildInfo.currentPosition === newMusicGuildInfo.queue.length) {
                    await message.channel.send("Reached the end of playlist");
                    newMusicGuildInfo.isPlaying = false;
                    musicManager.set(message.guildId!, newMusicGuildInfo);
                    return;
                }
                await message.channel.send(
                    `Track loaded. ${newMusicGuildInfo.queue[newMusicGuildInfo.currentPosition]?.info.title} | Duration: ${
                        newMusicGuildInfo.queue[newMusicGuildInfo.currentPosition]?.info.length
                    }`
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
            };
            musicManager.set(message.guildId, thisGuildInfo);
            musicGuildInfo = thisGuildInfo;
        }
        switch (searchRes.loadType as LavalinkLoadType) {
            case "TRACK_LOADED":
                musicGuildInfo?.queue.push(searchRes.tracks[0]!);
                await message.channel.send(`Track loaded. ${searchRes.tracks[0]?.info.title} | Duration: ${searchRes.tracks[0]?.info.length}`);
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
                await message.channel.send(`Track loaded. ${searchRes.tracks[0]?.info.title} | Duration: ${searchRes.tracks[0]?.info.length}`);
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