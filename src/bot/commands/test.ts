import { Command } from "@sapphire/framework";
import { Message, MessageEmbed } from "discord.js";
import { google } from "googleapis";
import { closureGoogleOauthTracker } from "../../lib/google";

export class TestCommand extends Command {
    public constructor(context: Command.Context, options: Command.Options) {
        super(context, {
            ...options,
            name: "test",
            description: "test sandbox",
        });
    }

    public async messageRun(message: Message) {
        await message.channel.send("...echoing requiem");
        const userGoogleOAuthState = closureGoogleOauthTracker.get(message.author.id);
        if (!userGoogleOAuthState) {
            await message.channel.send("You're not logged in");
            return;
        }
        const oauthClient = new google.auth.OAuth2();
        oauthClient.setCredentials({
            access_token: userGoogleOAuthState.access_token,
        });
        const youtubeService = google.youtube("v3");
        const res = await youtubeService.playlists.list({
            auth: oauthClient,
            mine: true,
            part: ["contentDetails", "snippet"],
        });
        const messageEmbed = new MessageEmbed();
        messageEmbed.setTitle("Closure: List of User's Playlist");
        if (!res.data.items || res.data.items.length === 0) {
            await message.channel.send("Searched through your Youtube account but found no playlist.");
            return;
        }
        for (const playlist of res.data.items!) {
            messageEmbed.addField(playlist.snippet?.title || "", `ID: ${playlist.id}`);
        }
        await message.channel.send({ embeds: [messageEmbed] });
    }
}
