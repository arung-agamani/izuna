import { Command } from "@sapphire/framework";
import type { Message } from "discord.js";
import musicManager from "../../../lib/musicQueue";
import logger from "../../../lib/winston";
// import prisma from "../../lib/prisma";

export class SkipMusicCommand extends Command {
    public constructor(context: Command.Context, options: Command.Options) {
        super(context, {
            ...options,
            name: "skip",
            description: "Skip playing music",
        });
    }

    public override async messageRun(message: Message) {
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
        // check if there is a current playing track
        if (musicGuildInfo.isPlaying) {
            musicGuildInfo.player.stopTrack();
            musicGuildInfo.isPlaying = false;
            await message.channel.send("Skipping the current track");
            return;
        } else {
            await message.channel.send("No track to skip.");
            return;
        }
    }
}
