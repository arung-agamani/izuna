import { Args, Command } from "@sapphire/framework";
import type { Message } from "discord.js";
import { Track } from "shoukaku";
import musicManager, { isGdriveLazyLoad, LavalinkLazyLoad } from "../../../lib/musicQueue";
import { fancyTimeFormat } from "../../../lib/utils";
import logger from "../../../lib/winston";
// import logger from "../../../lib/winston";

const digitsRegex = /^[0-9]{1,2}$/;

export class SeekPlayerCommand extends Command {
    public constructor(context: Command.Context, options: Command.Options) {
        super(context, {
            ...options,
            name: "seek",
            description: "Seek currently playing track to desired position.",
            detailedDescription: `This command accepts a string with format "hh:mm:ss" down to "ss".
            You can put "40" and it will be translated to position 40 seconds since the beginning.
            If putting 1:10, it will seek to position 70 seconds.
            If putting 1:1:10, it will seek to position 3670 seconds (1 hour + 1 minute + 10 seconds).
            It will decline if input position is greater than track's length.`,
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
            const inputString = await args.pick("string");
            const data = inputString.split(":");
            let pos = 0;
            let isValid = true;
            // validate
            for (const piece of data) {
                // logger.debug("Testing piece: " + piece);
                if (!digitsRegex.exec(piece) || Number(piece) < 0) {
                    isValid = false;
                    // logger.debug("Falling piece: " + piece);
                    break;
                }
            }
            if (!isValid) {
                await message.channel.send("Invalid string. Please input with format [hh:][mm:]ss");
                return;
            }
            if (data.length === 3) {
                pos += Number(data[0]) * 3600;
                pos += Number(data[1]) * 60;
                pos += Number(data[2]);
            } else if (data.length === 2) {
                pos += Number(data[0]) * 60;
                pos += Number(data[1]);
            } else if (data.length === 1) {
                pos += Number(data[0]);
            } else {
                await message.channel.send("Invalid string. Please input with format [hh:][mm:]ss");
                return;
            }
            let track = musicGuildInfo.queue[musicGuildInfo.currentPosition];
            if (isGdriveLazyLoad(track)) {
                track = track as LavalinkLazyLoad;
                await message.channel.send("Cannot set seeking for GDrive track (yet)");
                return;
            }
            if (pos * 1000 > (track as Track).info.length!) {
                await message.channel.send("Out of range.");
                return;
            }
            musicGuildInfo.player.seekTo(pos * 1000);
            await message.channel.send(`Player seeked to position ${fancyTimeFormat(pos)}`);
            return;
        } catch (error) {
            await message.channel.send("Error on command. Please put non-zero positive integer for both arguments");
            return;
        }
    }
}
