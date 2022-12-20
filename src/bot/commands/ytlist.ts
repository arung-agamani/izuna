import { Args, Command } from "@sapphire/framework";
import { Message, MessageEmbed } from "discord.js";
import { google, youtube_v3 } from "googleapis";
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
        let res = await youtubeService.playlistItems.list({
            auth: oauthClient,
            playlistId,
            part: ["snippet"],
            maxResults: 50,
        });
        const messageEmbed = new MessageEmbed();
        messageEmbed.setTitle("Closure: List of User's Playlist Items");
        if (!res.data.items || res.data.items.length === 0) {
            await message.channel.send("Searched through that playlist and no items? wtf");
            return;
        }
        // should've used do-while smh, but this works either way, so yeah...
        const container: youtube_v3.Schema$PlaylistItem[] = [];
        container.push(...res.data.items!);
        while (res.data.nextPageToken) {
            res = await youtubeService.playlistItems.list({
                auth: oauthClient,
                playlistId,
                part: ["snippet"],
                maxResults: 50,
                pageToken: res.data.nextPageToken,
            });
            if (res.data.items && res.data.items.length > 0) container.push(...res.data.items!);
        }
        for (const playlist of container) {
            messageEmbed.addField(playlist.snippet?.title || "", `https://www.youtube.com/watch?v=${playlist.snippet?.resourceId?.videoId}`);
        }
        await message.channel.send({ embeds: [messageEmbed] });
    }
}
