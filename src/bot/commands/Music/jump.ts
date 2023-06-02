import { Args, Command } from "@sapphire/framework";
import type { Message } from "discord.js";
import { Track } from "shoukaku";
import { getGoogleClient } from "../../../lib/google";
import musicManager, { getShoukakuManager, LavalinkLazyLoad } from "../../../lib/musicQueue";
import logger from "../../../lib/winston";

export class RemoveFromQueueCommand extends Command {
    public constructor(context: Command.Context, options: Command.Options) {
        super(context, {
            ...options,
            name: "jump",
            description: "Set the next play head to selected track number from queue",
        });
    }

    public override async messageRun(message: Message, args: Args) {
        logger.debug({
            message: `${this.name} command executed with message: ` + message.content,
            label: {
                source: "messageCommand",
                handler: this.name,
            },
        });
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
        try {
            const posToJump = await args.pick("integer");
            // check if there is a current playing track
            if (posToJump > 0 && posToJump <= musicGuildInfo.queue.length) {
                musicGuildInfo.skipPosition = posToJump - 1;
                musicGuildInfo.isSkippingQueued = true;
                await message.channel.send(`Set the play head to track ${posToJump}. **${musicGuildInfo.queue[posToJump - 1]?.info.title}**`);
                if (!musicGuildInfo.isPlaying && musicGuildInfo.currentPosition === musicGuildInfo.queue.length) {
                    let poppedTrack = musicGuildInfo.queue[posToJump - 1]!;
                    musicGuildInfo.currentPosition = posToJump - 1;
                    musicGuildInfo.isSkippingQueued = false;

                    if ((<LavalinkLazyLoad>poppedTrack).fileId) {
                        const searchTarget = await this.resolveGoogleDrive((<LavalinkLazyLoad>poppedTrack).fileId);
                        if (!searchTarget) {
                            await message.channel.send("Failed to query from Google Drive");
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
                return;
            }
            await message.channel.send(`Out of range track number.`);
            return;
        } catch (error) {
            await message.channel.send("Error on command. Please put non-zero positive integer");
            return;
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
