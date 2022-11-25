import { Args, Command } from "@sapphire/framework";
import type { Message } from "discord.js";
import musicManager from "../../../lib/musicQueue";

export class MoveQueueItemCommand extends Command {
    public constructor(context: Command.Context, options: Command.Options) {
        super(context, {
            ...options,
            name: "move",
            description: "Move selected track to new position",
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
            const posToMove = await args.pick("integer");
            const posToJump = await args.pick("integer");
            // check if there is a current playing track
            if (posToJump > 0 && posToJump <= musicGuildInfo.queue.length && posToMove > 0 && posToMove <= musicGuildInfo.queue.length) {
                const item = musicGuildInfo.queue.splice(posToMove - 1, 1)[0]!;
                musicGuildInfo.queue.splice(posToJump - 1, 0, item);
                await message.channel.send(`Moved track **${item.info.title}** to position **${posToJump}**`);
                return;
            }
            await message.channel.send(`Out of range track number.`);
            return;
        } catch (error) {
            await message.channel.send("Error on command. Please put non-zero positive integer for both arguments");
            return;
        }
    }
}
