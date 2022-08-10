import { Args, Command } from "@sapphire/framework";
import type { Message } from "discord.js";
import { config } from "../../config";
import prisma from "../../lib/prisma";
import reminderCollection, { restartReminderJob } from "../../lib/reminder";

export class ReminderCommand extends Command {
    public constructor(context: Command.Context, options: Command.Options) {
        super(context, {
            ...options,
            name: "reminder",
            description:
                "[BETA] Send a reminder message. If done in server channel, will be sent ",
            flags: ["delete", "d"],
        });
    }

    public async messageRun(message: Message, args: Args) {
        if (
            !(
                message.channel.type === "DM" ||
                message.channel.type === "GUILD_TEXT"
            )
        )
            return;
        if (!config.betaTesters.includes(message.author.id)) return;
        const cronString = await args.pick("string");
        const msg = await args.pick("string");
        const isDelete = args.getFlags("delete", "d");
        // validate cron string
        if (
            !cronString.match(
                /(@(annually|yearly|monthly|weekly|daily|hourly|reboot))|(@every (\d+(ns|us|µs|ms|s|m|h))+)|((((\d+,)+\d+|(\d+(\/|-)\d+)|\d+|\*) ?){5,7})/
            )
        ) {
            await message.channel.send("Cron string is not valid");
            return;
        }
        if (isDelete) {
            await message.channel.send("Delete flag detected. WIP response");
            return;
        }
        const reminderDbRes = await prisma.reminder.create({
            data: {
                uid: message.author.id,
                cronString,
                message: msg,
                channelType: message.channel.type === "DM" ? "DM" : "CHANNEL",
                guildId: message.guildId || "",
                channelId: message.channelId,
            },
        });
        reminderCollection.set(reminderDbRes.id, {
            id: String(reminderDbRes.id),
            uid: message.author.id,
            cronString,
            message: msg,
            channelType: message.channel.type === "DM" ? "DM" : "CHANNEL",
            guildId: message.guildId,
            channelId: message.channelId,
        });
        await message.channel.send(
            `Set reminder for <@${message.author.id}> with id "${reminderDbRes.id}", cron string \`"${cronString}"\`, and message "${msg}"`
        );
        restartReminderJob(this.container.client);
    }
}
