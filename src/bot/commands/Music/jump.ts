import { Args, Command } from "@sapphire/framework";
import type { Message } from "discord.js";
import musicManager from "../../../lib/musicQueue";

export class RemoveFromQueueCommand extends Command {
    public constructor(context: Command.Context, options: Command.Options) {
        super(context, {
            ...options,
            name: "jump",
            description: "Set the next play head to selected track number from queue",
        });
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
                    const poppedTrack = musicGuildInfo.queue[posToJump - 1]!;
                    musicGuildInfo.currentPosition = posToJump - 1;
                    musicGuildInfo.isSkippingQueued = false;
                    await musicGuildInfo.player.playTrack({ track: poppedTrack.track });
                    await message.channel.send(`Now playing **${poppedTrack.info.title}**, if it works...`);
                    musicGuildInfo.isPlaying = true;
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
}
