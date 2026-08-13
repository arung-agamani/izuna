import { Args, Command } from "@sapphire/framework";
import { Formatters, Message, EmbedBuilder, ChannelType, PermissionFlagsBits } from "discord.js";
import axios from "../../../lib/axios";
import logger, { logError, getErrorMessage } from "../../../lib/winston";
import { uploadFile } from "../../../lib/s3client";
import { TagService } from "../../../services/TagService";
import mime from "mime-types";

const MAX_SIZE = 8 * 1024 * 1024;

export class TagCommand extends Command {
    public constructor(context: Command.Context, options: Command.Options) {
        super(context, {
            ...options,
            name: "tag",
            description: "Tag utility. Use `add` for adding and `delete` for deleting",
            detailedDescription: `Tag utility.
            This feature acts as unlimited media repository where you can save text information or media (image and video and even files) for preservation.
            These information will has it's own "tag", which is callable by using the format "#[tag name]#" through text channel.
            The position does not matter, as long as the format exist in the text, then the tag will be searched.
            
            There are two scopes for the tags :
            Server-scoped.
            Tags that are stored on server, by using the tag add command on any text channel reachable by the bot, will be scoped to the server only, which means tags are not shared between servers.
            This makes everyone in the server able to use the tag.

            User-scoped.
            Tags that are scoped to the user. This is done by calling the "tag add" command directly to the bot's direct message (DM).
            This makes the user able to use the tag on any server that also has the bot as it's member.

            Calling any tag will first check if user has tag stored in user-scoped, then fallbacks to searching the server-scoped tags (if done in server).
            If no tag is found, bot will respond with stating that there is no such tag.
            `,
            flags: ["delete", "d"],
        });
    }

    public override async messageRun(message: Message, args: Args) {
        if (
            !(
                message.channel.type === ChannelType.DM ||
                message.channel.type === ChannelType.GuildText ||
                message.channel.type === ChannelType.PublicThread ||
                message.channel.type === ChannelType.PrivateThread
            )
        )
            return;

        const arg1 = await args.pick("string");
        if (arg1 === "add") {
            const arg2 = await args.pick("string");
            const AlphanumericRegex = /^[A-Za-z0-9]+$/;
            if (!AlphanumericRegex.test(arg2)) {
                await message.channel.send("Invalid tag validation. Please input only alphanumeric characters in single word.");
                return;
            }

            const tagService = TagService.getInstance();
            const scope = message.inGuild()
                ? ({ type: "guild" as const, guildId: message.guildId! })
                : ({ type: "user" as const, userId: message.author.id });

            const attachments = Array.from(message.attachments.values());
            if (message.attachments.size === 0) {
                const arg3 = await args.rest("string", { minimum: 1 });
                await tagService.upsertTextTag(scope, arg2, arg3, message.author.id);
                await message.channel.send(`Tag **${arg2}** registered`);
                return;
            }

            // Media tag — upload to S3, then upsert
            const file = attachments[0];
            if (file.size > MAX_SIZE) {
                await message.channel.send("Attachment size exceed the limit (8MB). Aborting...");
                return;
            }
            if (!file.contentType) {
                await message.channel.send("Cannot detect file type. Aborting...");
                return;
            }
            const scopeId = message.inGuild() ? message.guildId : message.author.id;
            const remoteFile = await axios.get(file.url, { responseType: "arraybuffer" });
            const buf = Buffer.from(remoteFile.data);
            const remoteUrl = await uploadFile(scopeId, `${arg2}.${mime.extension(file.contentType)}`, buf, file.contentType);
            if (!remoteUrl) {
                await message.channel.send("Failed to upload attachment to remote server.");
                return;
            }
            await tagService.upsertMediaTag(scope, arg2, remoteUrl, message.author.id);
            await message.channel.send(`Tag **${arg2}** registered`);
            return;
        }

        if (arg1 === "list") {
            const isGuild = message.inGuild();
            const tagService = TagService.getInstance();
            const tags = isGuild
                ? await tagService.list({ type: "guild", guildId: message.guildId! })
                : await tagService.list({ type: "user", userId: message.author.id });

            try {
                const arg2 = await args.pick("string");
                const AlphanumericRegex = /^[A-Za-z0-9]+$/;
                if (!AlphanumericRegex.test(arg2)) {
                    await message.channel.send("Invalid tag validation. Please input only alphanumeric characters in single word.");
                    return;
                }
                const embed = new EmbedBuilder();
                embed.setTitle(`Izuna: Tags (search mode)${!isGuild ? " - (User-only)" : ""}`);
                embed.setDescription(
                    `Registered tags similar with ${arg2}: \n ${tags
                        .map((x) => `\`${x.name}\``)
                        .filter((x) => x.match(new RegExp(arg2, "i")))
                        .join(" ")}`,
                );
                await message.channel.send({ embeds: [embed] });
            } catch {
                const embed = new EmbedBuilder();
                embed.setTitle(`Izuna: Tags${!isGuild ? " (User-only)" : ""}`);
                embed.setDescription(`Registered tags: \n ${tags.map((x) => `\`${x.name}\``).join(" ")}`);
                await message.channel.send({ embeds: [embed] });
            }
            return;
        }

        if (arg1 === "info") {
            let arg2: string;
            try {
                arg2 = await args.pick("string");
            } catch {
                await message.channel.send("Incorrect value for arg2. Please input tag name");
                return;
            }
            const AlphanumericRegex = /^[A-Za-z0-9]+$/;
            if (!AlphanumericRegex.test(arg2)) {
                await message.channel.send("Invalid tag validation. Please input only alphanumeric characters in single word.");
                return;
            }

            const tag = await TagService.getInstance().resolve(message.author.id, message.guildId, arg2);
            if (!tag) {
                await message.channel.send(`There is no tag with name \`${arg2}\`.`);
                return;
            }
            const embed = new EmbedBuilder();
            embed.setTitle(`Izuna: Tag Info`);
            embed.setDescription(`**${tag.name}**
            Submitter: ${Formatters.userMention(tag.userId)}
            Date added : ${tag.createdAt.toLocaleDateString("id")}
            Is Media? : ${tag.isMedia ? "True" : "False"}
            Content: ${tag.message.length > 500 ? `${tag.message.slice(0, 499)}... _message truncated_` : tag.message}
            `);
            await message.channel.send({ embeds: [embed] });
            return;
        }

        if (arg1 === "delete") {
            let arg2: string;
            try {
                arg2 = await args.pick("string");
            } catch {
                await message.channel.send("No tag name provided.");
                return;
            }

            const isGuild = message.inGuild();
            if (isGuild) {
                if (message.member?.permissions.has(PermissionFlagsBits.Administrator) === false) {
                    await message.channel.send(`This command is for admin only.`);
                    return;
                }
                await TagService.getInstance().delete({ type: "guild", guildId: message.guildId! }, arg2);
                await message.channel.send(`Tag **${arg2}** has been deleted from this server`);
                return;
            }

            await TagService.getInstance().delete({ type: "user", userId: message.author.id }, arg2);
            await message.channel.send(`Tag **${arg2}** has been deleted from this user`);
            return;
        }

        await message.channel.send("Unrecognized command");
    }
}
