import { Args, Command } from "@sapphire/framework";
import { Message, MessageEmbed } from "discord.js";
import { google } from "googleapis";
import { closureGoogleOauthTracker } from "../../lib/google";

export class TestSlashCommand extends Command {
    public constructor(context: Command.Context, options: Command.Options) {
        super(context, {
            ...options,
            name: "ytlist",
            description: "Youtube list of items.",
        });
    }

    public override async messageRun(message: Message, args: Args) {
        await message.channel.send("...echoing requiem");
        const userGoogleOAuthState = closureGoogleOauthTracker.get(message.author.id);
        if (!userGoogleOAuthState) {
            await message.channel.send("You're not logged in");
            return;
        }
        const playlistId = await args.pick("string");
        const oauthClient = new google.auth.OAuth2();
        oauthClient.setCredentials({
            access_token: userGoogleOAuthState.access_token,
        });
        const youtubeService = google.youtube("v3");
        const res = await youtubeService.playlistItems.list({
            auth: oauthClient,
            playlistId,
            part: ["snippet"],
        });
        const messageEmbed = new MessageEmbed();
        messageEmbed.setTitle("Closure: List of User's Playlist Items");
        if (!res.data.items || res.data.items.length === 0) {
            await message.channel.send("Searched through that playlist and no items? wtf");
            return;
        }
        for (const playlist of res.data.items!) {
            messageEmbed.addField(playlist.snippet?.title || "", `https://www.youtube.com/watch?v=${playlist.snippet?.resourceId?.videoId}`);
        }
        await message.channel.send({ embeds: [messageEmbed] });
    }
}
