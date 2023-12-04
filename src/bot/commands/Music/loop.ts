import { Args, Command } from "@sapphire/framework";
import type { Message } from "discord.js";
import musicManager from "../../../lib/musicQueue";
import logger from "../../../lib/winston";

const aliases = {
    single: ["one", "1", "single", "this"],
    playlist: ["all", "entire", "playlist"],
    none: ["none", "0", "off", "disable", "stop"],
};

export class LoopQueueCommand extends Command {
    public constructor(context: Command.Context, options: Command.Options) {
        super(context, {
            ...options,
            name: "loop",
            aliases: ["repeat"],
            description: `Loop through the queue in various ways.\nAvailable options: "all", "one", "1", "none"`,
            detailedDescription: `Loop through the playlist. Requires one argument.
            There are two looping method :
            
            Single-track loop. This will repeat only the currently playing track.
            Playlist loop. This will reset the playhead to the beginning of playlist after it reached the end of playlist.
            
            Aliases for track loop mode :
            single : "one", "1", "single", "this"
            playlist: "all", "entire", "playlist"
            
            To turn off the looping, use one of the following argument : "none", "0", "off", "disable", "stop`,
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
            const loopMode = await args.pick("string");
            if (aliases.playlist.includes(loopMode)) {
                musicGuildInfo.isRepeat = "playlist";
                await message.channel.send("Set the loop to **entire playlist**.");
            } else if (aliases.single.includes(loopMode)) {
                musicGuildInfo.isRepeat = "single";
                await message.channel.send("Set the loop to **this** track only.");
            } else if (aliases.none.includes(loopMode)) {
                musicGuildInfo.isRepeat = "no";
                await message.channel.send("Track repeat has been disabled.");
            } else {
                await message.channel.send('Wrong argument given. Please specify between "all" or "1" or "one" or "none"');
                return;
            }
        } catch (error) {
            await message.channel.send('No arguments given. Please specify between "all" or "1" or "one" or "none"');
        }
    }
}
