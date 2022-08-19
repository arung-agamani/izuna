import { Command } from "@sapphire/framework";
import type { Message } from "discord.js";
import musicManager from "../../lib/musicQueue";
// import prisma from "../../lib/prisma";

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
        // check if there is a current playing track
        let msg = "";
        if (musicGuildInfo.queue.length === 0) {
            msg += "No item in queue.";
        }
        let i = 0;
        for (const track of musicGuildInfo.queue) {
            if (i === musicGuildInfo.currentPosition) {
                msg += `**${i + 1}. ${track.info.title} - Duration ${track.info.length}**\n`;
            } else {
                msg += `${i + 1}. ${track.info.title} - Duration ${track.info.length}\n`;
            }
            i++;
        }
        await message.channel.send(msg);
        return;
    }
}
