import { Args, Command } from "@sapphire/framework";
import type { Message } from "discord.js";
import { addToJ2CVCManager } from "../../lib/channelTracker";

export class SetCommand extends Command {
    public constructor(context: Command.Context, options: Command.Options) {
        super(context, {
            ...options,
            name: "set",
            description: "Set various server rules",
        });
    }

    public async messageRun(message: Message, args: Args) {
        if (!message.guildId) {
            await message.channel.send("This command only works in servers");
            return;
        }
        if (message.member?.permissions.has("ADMINISTRATOR") === false) {
            await message.channel.send("You need admin access.");
            return;
        }
        const arg1 = await args.pick("string");
        if (arg1 === "ephemeral-vc") {
            if (!message.guild?.me?.permissions.has("MANAGE_CHANNELS") || !message.guild.me.permissions.has("MOVE_MEMBERS")) {
                await message.channel.send("I need `Manage Channels` and `Move Members` permissions for that");
                return;
            }
            const arg2 = await args.rest("string");
            const channel = message.guild?.channels.cache.find((channel) => channel.type === "GUILD_VOICE" && channel.name === arg2);
            if (!channel) {
                await message.channel.send(`Voice channel \`${arg2}\` not found.`);
                return;
            }
            // joinToCreateVoiceChatManager.set(message.guildId, channel.id);
            await addToJ2CVCManager(message.guildId, channel.id);
            await message.channel.send(`Voice channel \`${channel.name}\` set to listen to rule \`ephemeral-vc\``);
            return;
        } else {
            await message.channel.send(`Rule \`${arg1}\` doesn't exist.\nAvailable subcommands : \`ephemeral-vc\``);
            return;
        }
    }
}
