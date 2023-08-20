import { InteractionHandler, InteractionHandlerTypes, PieceContext } from "@sapphire/framework";
import {
    ButtonInteraction,
    Message,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    StringSelectMenuInteraction,
    Interaction,
    StringSelectMenuBuilder,
} from "discord.js";
import { getKanaInstance, Kana } from "../../lib/kana";
import { SearchCharacterResult } from "../../lib/kana/collections/chara";
import logger from "../../lib/winston";
import { addInteractionEntry, debounceInteraction } from "../../lib/interactionTimeout";
import musicManager, { LavalinkLoadType, MusicGuildInfo, getShoukakuManager } from "../../lib/musicQueue";
import { LavalinkResponse, Track } from "shoukaku";
import { fancyTimeFormat } from "../../lib/utils";

export class SearchInteractionHandler extends InteractionHandler {
    public constructor(ctx: PieceContext, options: InteractionHandler.Options) {
        super(ctx, {
            ...options,
            interactionHandlerType: InteractionHandlerTypes.Button,
        });
    }

    public async run(interaction: ButtonInteraction, parsedData: InteractionHandler.ParseResult<this>) {
        console.log(`Interaction handler for ${interaction.customId} being handled by SearchInteractionHandler`)
        await interaction.deferUpdate()
        // await interaction.message.edit({ embeds: [], components: [], content: `You've selected ${parsedData.ytId} for id`})
        
        if (parsedData.ytId === "CANCELATIONAWOO") {
            await interaction.message.edit({ embeds: [], components: [], content: "Canceled the interaction"})
            return
        }
        
        const shoukakuManager = getShoukakuManager()
        if (!shoukakuManager) {
            await interaction.message.edit("Music manager is not yet initialized")
            return
        }
        // logger.debug("Music player initialized")
        const lavalinkNode = shoukakuManager.getNode()
        if (!lavalinkNode) {
            await interaction.message.edit("No music player node currently connected.")
            return
        }
        // logger.debug("Found connected music player node")
        const member = interaction.guild?.members.cache.get(parsedData.userId)
        if (!member) {
            await interaction.message.edit("User is currently not in the server. Error on app on this part")
            return
        }
        // logger.debug("User is in the server")
        if (!member.voice.channel) {
            await interaction.message.edit("You must be in voice channel first.");
            return;
        }
        // logger.debug("User is in the server's voice channel")
        let searchRes = await lavalinkNode.rest.resolve(parsedData.ytId)
        if ((searchRes?.loadType as LavalinkLoadType) === "LOAD_FAILED" || !searchRes) {
            await interaction.message.edit("Failed to search that query. Try with different formatting, I guess?");
            return;
        }
        // logger.debug("The load type of searchRes is not failed")
        let musicGuildInfo = musicManager.get(interaction.message.guildId!)
        if (!musicGuildInfo) {
        //     logger.debug(`Supplied args: ${JSON.stringify({
        //         guildId: member.guild.id,
        //         channelId: member.voice.channel.id,
        //         shardId: 0,
        //     })}`)
            const player = await lavalinkNode.joinChannel({
                guildId: member.guild.id,
                channelId: member.voice.channel.id,
                shardId: 0,
            });
            // logger.debug("Created player")
            player.on("exception", (err) => {
                logger.error("Shoukaku player error");
                logger.error(err);
                if (err.error === "This video is not available") {
                    interaction.message.edit("Skipping the track. Reason: This video is not available :(");
                }
            });
            player.on("end", async (data) => {
                if (data.reason === "REPLACED") return;
                const currentMusicGuildInfo = musicManager.get(interaction.message.guildId!);
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
                    await interaction.message.channel.send("Reached the end of playlist");
                    if (newMusicGuildInfo.isRepeat === "playlist") {
                        newMusicGuildInfo.currentPosition = 0;
                        await interaction.message.channel.send("Playlist loop is set. Resetting playhead to the beginning of the queue.");
                        let poppedTrack = newMusicGuildInfo.queue[newMusicGuildInfo.currentPosition]!;
                        
                        poppedTrack = poppedTrack as Track;
                        await newMusicGuildInfo.player.playTrack({
                            track: poppedTrack.track,
                            options: {
                                startTime: poppedTrack.info.position,
                            },
                        });
                        await interaction.message.channel.send(`Now playing **${poppedTrack.info.title}**, if it works...`);
                            newMusicGuildInfo.isPlaying = true;
                    } else {
                        newMusicGuildInfo.isPlaying = false;
                    }
                    musicManager.set(interaction.message.guildId!, newMusicGuildInfo);
                    return;
                }

                // play the track or smth
                let currentTrack = newMusicGuildInfo.queue[newMusicGuildInfo.currentPosition];
                
                currentTrack = currentTrack as Track;
                await interaction.message.channel.send(`Track loaded. ${currentTrack.info.title} | Duration: ${fancyTimeFormat(currentTrack.info.length! / 1000)}`);
                newMusicGuildInfo.player.playTrack({
                    track: currentTrack.track!,
                    options: {
                        startTime: currentTrack.info.position!,
                    },
                });

                newMusicGuildInfo.isPlaying = true;
                musicManager.set(interaction.message.guildId!, newMusicGuildInfo);
            });
            // put in manager
            let thisGuildInfo: MusicGuildInfo = {
                initiator: interaction.message.author.id,
                voiceChannel: member.voice.channel!,
                currentPosition: 0, // 0-based indexing
                isRepeat: "no",
                isPlaying: false,
                isPausing: false,
                queue: [],
                player: player,
                isSkippingQueued: false,
                skipPosition: 0,
            };
            musicManager.set(interaction.message.guildId!, thisGuildInfo);
            musicGuildInfo = thisGuildInfo;
        }
        switch (searchRes.loadType as LavalinkLoadType) {
            case "TRACK_LOADED":
                searchRes = searchRes as LavalinkResponse;
                logger.debug(`LoadType: ${searchRes.loadType} for query ${parsedData.ytId}`);
                musicGuildInfo?.queue.push(searchRes.tracks[0]!);
                await interaction.message.channel.send(
                    `Track loaded. ${searchRes.tracks[0]?.info.title} | Duration: ${fancyTimeFormat(searchRes.tracks[0]?.info.length! / 1000)} | Pos: ${
                        musicGuildInfo.queue.length
                    }. | Timestamp: ${fancyTimeFormat(searchRes.tracks[0]!.info.position / 1000)}`
                );
                break;
        }
        if (!musicGuildInfo.isPlaying) {
            let poppedTrack = musicGuildInfo.queue[musicGuildInfo.currentPosition]!;
            
            poppedTrack = poppedTrack as Track;
            await musicGuildInfo.player.playTrack({
                track: poppedTrack.track,
                options: {
                    startTime: poppedTrack.info.position,
                },
            });
            await interaction.message.channel.send(`Now playing **${poppedTrack.info.title}**, if it works...`);
            musicGuildInfo.isPlaying = true;
        }

        // safeguard
        await interaction.message.delete()
    }

    public async parse(interaction: ButtonInteraction) {
        logger.debug(`[search] Received interaction with custom id: ${interaction.customId}`);
        if (interaction.customId.startsWith("ytplay")) {
            const vals = interaction.customId.split(":")
            return this.some({
                userId: vals[1],
                ytId: vals[2]
            })
        } else {
            return this.none()
        }
    }

}
