import { Command } from "@sapphire/framework";
import type { Message } from "discord.js";
import musicManager, { getShoukakuManager } from "../../../lib/musicQueue";
import logger from "../../../lib/winston";
import prisma from "../../../lib/prisma";
// import prisma from "../../lib/prisma";

export class ShuffleMusicQueueCommand extends Command {
    public constructor(context: Command.Context, options: Command.Options) {
        super(context, {
            ...options,
            name: "shuffle",
            description: "Shuffle current playlist",
            detailedDescription: `Shuffle the current playlist. The current playhead will stay the same (to be fixed)`,
        });
    }

    private shuffle = (array: any[]) => {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    };

    public override async messageRun(message: Message) {
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
        // await musicGuildInfo.player.stopTrack();
        const shoukakuManager = getShoukakuManager();
        if (!shoukakuManager) {
            await message.channel.send("Music manager uninitizalied. Check your implementation, dumbass");
            return;
        }
        let currentId = "";
        if (musicGuildInfo.isPlaying) {
            currentId = musicGuildInfo.queue[musicGuildInfo.currentPosition].info.uri!;
        }
        musicGuildInfo.queue = this.shuffle(musicGuildInfo.queue);
        if (musicGuildInfo.isPlaying) {
            musicGuildInfo.currentPosition = musicGuildInfo.queue.findIndex((x) => x.info.uri === currentId);
        }
        await message.channel.send("Playlist shuffled. Review the shuffled playlist by calling `nowplaying` command");
        // point to the currently playing
    }
}
