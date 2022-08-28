import { Args, Command } from "@sapphire/framework";
import type { Message } from "discord.js";
import axios, { AxiosError } from "axios";
import FormData from "form-data";
import prisma from "../../lib/prisma";

export class RkgkCommand extends Command {
    public constructor(context: Command.Context, options: Command.Options) {
        super(context, {
            ...options,
            name: "rkgk",
            // aliases: ["pong"],
            description: "Let sugar handles your rkgk needs.",
        });
    }

    public async messageRun(message: Message, args: Args) {
        // check if user exist
        const mode = await args.pick("string");
        if (mode === "register") {
            if (message.inGuild()) {
                await message.channel.send(
                    "Cannot do this command in server.\nYou'll input certain secret info, so let's get a room, nyaa."
                );
                return;
            }
            const discordUser = await prisma.user.findUnique({
                where: { uid: message.author.id },
            });
            if (!discordUser) {
                await prisma.user.create({
                    data: {
                        uid: message.author.id,
                        name: message.author.username,
                    },
                });
                await message.channel.send("User created...");
            }
            const userApiKey = await prisma.danbooruUser.findUnique({
                where: { discord_uid: message.author.id },
            });
            if (userApiKey) {
                await message.channel.send("You have registered your API key");
                return;
            }
            const username = await args.pick("string");
            const apikey = await args.pick("string");
            await prisma.danbooruUser.create({
                data: {
                    discord_uid: message.author.id,
                    api_key: apikey,
                    username,
                },
            });
            await message.channel.send(
                "Your API key has been registered, nyaa!"
            );
            return;
        } else if (mode === "upload") {
            const discordUser = await prisma.user.findUnique({
                where: { uid: message.author.id },
            });
            if (!discordUser) {
                await prisma.user.create({
                    data: {
                        uid: message.author.id,
                        name: message.author.username,
                    },
                });
                await message.channel.send("User created...");
            }
            const userApiKey = await prisma.danbooruUser.findUnique({
                where: { discord_uid: message.author.id },
            });
            if (!userApiKey) {
                await message.channel.send(
                    "You haven't registered API key. Please go to your profile page and create API key.\nThen, run `sugar, rkgk register` command"
                );
                return;
            }
            // retrieve image attached with message
            if (message.attachments.size <= 0) {
                await message.channel.send(
                    "Your message doesn't have any attachment. Please redo `sugar, rkgk upload` command with media attached, nyaa"
                );
                return;
            }
            const imageAttachment = Array.from(
                message.attachments.values()
            )[0]!;
            const imageUrl = imageAttachment.url;
            const authString = Buffer.from(
                `${userApiKey.username}:${userApiKey.api_key}`
            ).toString("base64");
            let uploadImageRes;
            try {
                const formData = new FormData();
                formData.append("upload[source]", imageUrl);
                uploadImageRes = await axios.post(
                    "https://rkgk.genshiken-itb.org/uploads.json",
                    formData,
                    {
                        headers: {
                            Authorization: `Basic ${authString}`,
                        },
                    }
                );
            } catch (error) {
                console.log((error as AxiosError).response?.data);
                await message.channel.send("Error happened on first flow");
                await message.channel.send(JSON.stringify(error));
                return;
            }
            let createPostRes;
            try {
                await message.channel.send("Please wait for a while...");
                await new Promise((resolve) => setTimeout(resolve, 10000));
                uploadImageRes = await axios.get(
                    `https://rkgk.genshiken-itb.org/uploads/${uploadImageRes.data.id}.json`,
                    {
                        headers: {
                            Authorization: `Basic ${authString}`,
                        },
                    }
                );
                const tag_string = await args.rest("string");
                const formData2 = new FormData();
                formData2.append(
                    "upload_media_asset_id",
                    uploadImageRes.data.upload_media_assets[0].id
                );
                formData2.append(
                    "media_asset_id",
                    uploadImageRes.data.upload_media_assets[0].media_asset_id
                );
                formData2.append("post[rating]", "g");
                formData2.append("post[tag_string]", tag_string || "");
                formData2.append("commit", "Post");
                createPostRes = await axios.post(
                    "https://rkgk.genshiken-itb.org/posts.json",
                    formData2,
                    {
                        headers: {
                            Authorization: `Basic ${authString}`,
                        },
                    }
                );
                if (createPostRes.data.id) {
                    await message.channel.send(
                        `Uploaded! Visit https://rkgk.genshiken-itb.org/posts/${createPostRes.data.id}`
                    );
                    return;
                }
                await message.channel.send(
                    "It reached the end of the flow but something is wrong...."
                );
                return;
            } catch (error) {
                console.log(error);
                await message.channel.send("Error happened on second flow");
                await message.channel.send(JSON.stringify(error));
                return;
            }
        }
    }
}
