import { Args, ChatInputCommand, Command } from "@sapphire/framework";
import type { Message, TextBasedChannel, VoiceBasedChannel } from "discord.js";
import { HttpUrlRegex } from "@sapphire/discord-utilities";
import musicManager, { MusicGuildInfo, getShoukakuManager, LavalinkLoadType, LavalinkLazyLoad, shoukakuLoadType2String } from "../../../lib/musicQueue";
import logger from "../../../lib/winston";
import { fancyTimeFormat } from "../../../lib/utils";
import { getGoogleClient } from "../../../lib/google";
import { Connection, ErrorResult, LavalinkResponse, LoadType, Node, Playlist, PlaylistResult, SearchResult, Track } from "shoukaku";

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
            description: "Plays music", // TODO: make better description
            detailedDescription: `Play music using given search query (like how you would use the search function in Youtube directly), or through provided Youtube link.
            Accepts only Youtube for now, Spotify or Soundcloud, or other sources will be considered when there is high demand.`,
        });
    }

    public override registerApplicationCommands(registry: ChatInputCommand.Registry) {
        registry.registerChatInputCommand(
            (builder) => {
                builder
                    .setName("play")
                    .setDescription("Play music from Youtube links or search query")
                    .addStringOption((opt) => opt.setName("query").setDescription("Enter search query or link").setRequired(true))
                    .addBooleanOption((opt) => opt.setName("seek").setDescription("Seek to timestamp if exist").setRequired(false));
            },
            {
                idHints: ["1176094847669637171", "1176133402689273958"],
            }
        );
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
        const query = interaction.options.getString("query", true);
        const isSeeking = interaction.options.getBoolean("seek", false) || false;
        const guildId = interaction.guildId;
        const authorId = interaction.user.id;

        await interaction.deferReply();
        await this.play(textChannel, voiceChannel, guildId, authorId, query, isSeeking);
        await interaction.followUp({ content: "Play command complete!", ephemeral: true });
    }

    public override async messageRun(message: Message, args: Args) {
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
        await this.play(message.channel, message.member.voice.channel, message.guildId, message.author.id, searchQuery, isSeeking);
        return;
    }

    public async play(
        textChannel: TextBasedChannel,
        voiceChannel: VoiceBasedChannel,
        guildId: string,
        authorId: string,
        searchQuery: string,
        isSeeking: boolean
    ) {
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
            await textChannel.send("Please put in something to search");
            return;
        }
        const shoukakuManager = getShoukakuManager();
        if (!shoukakuManager) {
            await textChannel.send("Music manager uninitizalied. Check your implementation, dumbass");
            return;
        }

        // let lavalinkNode: Node | undefined
        // const lavalinkConn = new Connection(shoukakuManager, {
        //     guildId,
        //     channelId: voiceChannel.id,
        //     shardId: 0
        // })
        // shoukakuManager.connections.set(guildId, lavalinkConn)
        // @ts-ignore
        const lavalinkNode = shoukakuManager.options.nodeResolver(shoukakuManager.nodes);
        if (!lavalinkNode) {
            await textChannel.send("No music player node currently connected.");
            return;
        }

        let searchRes: LavalinkResponse | LavalinkLazyLoad | undefined;
        if (youtubePlaylistRes) {
            logger.debug("Resolving as playlistId");
            logger.debug(`playlistId: ${playlistId}`);
            if (playlistId.startsWith("OLAK5uy")) {
                searchRes = await lavalinkNode.rest.resolve(`https://www.youtube.com/playlist?list=${playlistId}`);
            } else {
                searchRes = await lavalinkNode.rest.resolve(playlistId);
            }
        } else if (youtubeRegexRes) {
            logger.debug("Resolving as videoId");
            searchRes = await lavalinkNode.rest.resolve(videoId);
            if (isSeeking) {
                const track = searchRes!.data as Track;
                track.info.position = targetTimestamp * 1000;
                logger.debug(`Search set with seeking flag. Timestamp : ${targetTimestamp}`);
                logger.debug(`searchRes.tracks[0].info.position = ${track.info.position}`);
            }
        } else if (driveRegex.exec(searchQuery)) {
            logger.debug("Resolving as gdriveId");
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
            logger.debug("Resolving as httpId");
            logger.debug("Is inside HttpUrlRegex=true, line 106");
            searchRes = await lavalinkNode.rest.resolve(searchQuery);
        } else {
            logger.debug("Resolving as searchId");
            logger.debug("Is inside standard ytsearch=true, line 109");
            searchRes = await lavalinkNode.rest.resolve(`ytsearch: ${searchQuery}`);
        }
        if (!searchRes) {
            logger.error(`Search result returns null: 185`);
            await textChannel.send("Search result returns undefined. That's weird...");
            return;
        }
        if (searchRes.loadType !== "LAZY_LOAD_GDRIVE") {
            searchRes.loadType = shoukakuLoadType2String(searchRes.loadType as LoadType);
        }

        logger.debug(`Search done through REST API returns type ${searchRes?.loadType}`);
        if ((searchRes.loadType as LavalinkLoadType) === "LOAD_FAILED" || !searchRes) {
            logger.debug(`187: LoadType: ${searchRes?.loadType}`);
            await textChannel.send("Failed to search that query. Try with different formatting, I guess?");
            return;
        }
        let musicGuildInfo = musicManager.get(guildId);
        if (!musicGuildInfo) {
            logger.debug(
                `Supplied args: ${JSON.stringify({
                    guildId: guildId,
                    channelId: voiceChannel.id,
                    shardId: 0,
                })}`
            );
            // const player = await lavalinkNode.joinChannel({
            //     guildId: guildId,
            //     channelId: voiceChannel.id,
            //     shardId: 0,
            // });
            const player = await shoukakuManager.joinVoiceChannel({
                guildId,
                channelId: voiceChannel.id,
                shardId: 0,
            });
            player.on("exception", (err) => {
                logger.error("Shoukaku player error");
                logger.error(err);
                if (err.exception.message === "This video is not available") {
                    textChannel.send("Skipping the track. Reason: This video is not available :(");
                }
            });
            player.on("end", async (data) => {
                // console.log(data);
                if (data.reason === "replaced") return;
                const currentMusicGuildInfo = musicManager.get(guildId!);
                if (!currentMusicGuildInfo) return;
                if (currentMusicGuildInfo.stopIssued) {
                    return;
                }
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
                    await textChannel.send("Reached the end of playlist");
                    if (newMusicGuildInfo.isRepeat === "playlist") {
                        newMusicGuildInfo.currentPosition = 0;
                        await textChannel.send("Playlist loop is set. Resetting playhead to the beginning of the queue.");
                        let poppedTrack = newMusicGuildInfo.queue[newMusicGuildInfo.currentPosition]!;
                        if ((<LavalinkLazyLoad>poppedTrack).fileId) {
                            const searchTarget = await this.resolveGoogleDrive((<LavalinkLazyLoad>poppedTrack).fileId);
                            if (!searchTarget) {
                                await textChannel.send("Failed to query from Google Drive");
                                return;
                            }
                            let newPoppedTrack = await lavalinkNode.rest.resolve(searchTarget!);
                            if (!newPoppedTrack) {
                                await textChannel.send("Failed to resolve WebContentLink as Playable Track");
                                return;
                            }
                            const track = newPoppedTrack.data as Track;
                            await newMusicGuildInfo.player.playTrack({
                                track: track.encoded,
                            });
                            await textChannel.send(`Now playing **${track.info.title}**, if it works...`);
                            newMusicGuildInfo.isPlaying = true;
                        } else {
                            poppedTrack = poppedTrack as Track;
                            await newMusicGuildInfo.player.playTrack({
                                track: poppedTrack.encoded,
                                options: {
                                    startTime: poppedTrack.info.position,
                                },
                            });
                            await textChannel.send(`Now playing **${poppedTrack.info.title}**, if it works...`);
                            newMusicGuildInfo.isPlaying = true;
                        }
                    } else {
                        newMusicGuildInfo.isPlaying = false;
                    }
                    musicManager.set(guildId, newMusicGuildInfo);
                    return;
                }

                // play the track or smth
                let currentTrack = newMusicGuildInfo.queue[newMusicGuildInfo.currentPosition];
                if ((<LavalinkLazyLoad>currentTrack).fileId) {
                    currentTrack = currentTrack as LavalinkLazyLoad;
                    const searchTarget = await this.resolveGoogleDrive(currentTrack.fileId);
                    if (!searchTarget) {
                        await textChannel.send("Failed to query from Google Drive");
                        return;
                    }
                    let newPoppedTrack = await lavalinkNode.rest.resolve(searchTarget!);
                    if (!newPoppedTrack) {
                        await textChannel.send("Failed to resolve WebContentLink as Playable Track");
                        return;
                    }
                    const track = newPoppedTrack.data as Track;
                    await newMusicGuildInfo.player.playTrack({
                        track: track.encoded,
                    });
                    await textChannel.send(`Now playing **${track.info.title}**, if it works...`);
                    newMusicGuildInfo.isPlaying = true;
                } else {
                    currentTrack = currentTrack as Track;
                    await textChannel.send(`Track loaded. ${currentTrack.info.title} | Duration: ${fancyTimeFormat(currentTrack.info.length! / 1000)}`);
                    newMusicGuildInfo.player.playTrack({
                        track: currentTrack.encoded,
                        options: {
                            startTime: currentTrack.info.position!,
                        },
                    });
                }

                newMusicGuildInfo.isPlaying = true;
                musicManager.set(guildId, newMusicGuildInfo);
            });
            // put in manager
            let thisGuildInfo: MusicGuildInfo = {
                initiator: authorId,
                voiceChannel: voiceChannel,
                currentPosition: 0, // 0-based indexing
                isRepeat: "no",
                isPlaying: false,
                isPausing: false,
                queue: [],
                player: player,
                isSkippingQueued: false,
                skipPosition: 0,
                stopIssued: false,
            };
            musicManager.set(guildId, thisGuildInfo);
            musicGuildInfo = thisGuildInfo;
        }
        switch (searchRes.loadType as LavalinkLoadType) {
            case "LAZY_LOAD_GDRIVE":
                searchRes = searchRes as LavalinkLazyLoad;
                musicGuildInfo.queue.push(searchRes);
                await textChannel.send(
                    `Track loaded. ${searchRes.info.title} | Pos: ${musicGuildInfo.queue.length}\nThis track will be lazy-loaded on it's turn.`
                );
                break;
            case "TRACK_LOADED":
                searchRes = searchRes as LavalinkResponse;
                logger.debug(`LoadType: ${searchRes.loadType} for query ${searchQuery}`);
                const track = searchRes.data as Track;
                musicGuildInfo?.queue.push(track);
                await textChannel.send(
                    `Track loaded. ${track.info.title} | Duration: ${fancyTimeFormat(track.info.length! / 1000)} | Pos: ${
                        musicGuildInfo.queue.length
                    }. | Timestamp: ${fancyTimeFormat(track.info.position / 1000)}`
                );
                break;
            case "PLAYLIST_LOADED":
                searchRes = searchRes as LavalinkResponse;
                logger.debug(`LoadType: ${searchRes.loadType} for query ${searchQuery}`);
                const tracks = (searchRes.data as Playlist).tracks;
                musicGuildInfo?.queue.push(...tracks);
                let msg = "";
                for (const track of tracks) {
                    msg += `Track loaded. ${track.info.title} | Duration: ${track.info.length}\n`;
                }
                if (msg.length > 2000) msg = msg.slice(0, 1997) + "...";
                await textChannel.send(msg);
                break;
            case "SEARCH_RESULT":
                searchRes = searchRes as SearchResult;
                logger.debug(`LoadType: ${searchRes.loadType} for query ${searchQuery}`);
                musicGuildInfo?.queue.push(searchRes.data[0]!);
                await textChannel.send("Search result for: " + searchQuery);
                await textChannel.send(
                    `Track loaded. **${searchRes.data[0]?.info.title}** | Duration: ${fancyTimeFormat(searchRes.data[0]?.info.length! / 1000)} | Pos: ${
                        musicGuildInfo.queue.length
                    }`
                );
                break;
            case "NO_MATCHES":
                logger.debug(`LoadType: ${searchRes.loadType} for query ${searchQuery}`);
                await textChannel.send("No result found... Hmm...");
                return;
            case "LOAD_FAILED":
                logger.debug(`LoadType: ${searchRes.loadType} for query ${searchQuery}`);
                logger.error(`Loading error on line 369: ${(searchRes as ErrorResult).data.message} - ${(searchRes as ErrorResult).data.cause}`);
                await textChannel.send(`Loading error: ${(searchRes as ErrorResult).data.message}`);
                return;
            default:
                logger.warn(`LoadType : Default case reached (unknown case)`);
                logger.warn(`Aborting to prevent weird issues`);
                return;
        }
        // play the head
        if (!musicGuildInfo.isPlaying) {
            let poppedTrack = musicGuildInfo.queue[musicGuildInfo.currentPosition]!;
            if ((<LavalinkLazyLoad>poppedTrack).fileId) {
                const searchTarget = await this.resolveGoogleDrive((<LavalinkLazyLoad>poppedTrack).fileId);
                if (!searchTarget) {
                    await textChannel.send("Failed to query from Google Drive");
                    return;
                }
                let newPoppedTrack = await lavalinkNode.rest.resolve(searchTarget!);
                if (!newPoppedTrack) {
                    await textChannel.send("Failed to resolve WebContentLink as Playable Track");
                    return;
                }
                const track = newPoppedTrack.data as Track;
                await musicGuildInfo.player.playTrack({
                    track: track.encoded,
                });
                await textChannel.send(`Now playing **${track.info.title}**, if it works...`);
                musicGuildInfo.isPlaying = true;
            } else {
                poppedTrack = poppedTrack as Track;
                await musicGuildInfo.player.playTrack({
                    track: poppedTrack.encoded,
                    options: {
                        startTime: poppedTrack.info.position,
                    },
                });
                await textChannel.send(`Now playing **${poppedTrack.info.title}**, if it works...`);
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
