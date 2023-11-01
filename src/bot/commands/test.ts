import { ChatInputCommand, Command } from "@sapphire/framework";
import { Message, EmbedBuilder } from "discord.js";
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

    public override registerApplicationCommands(registry: ChatInputCommand.Registry) {
        registry.registerChatInputCommand(
            (builder) => {
                builder
                    .setName("test")
                    .setDescription("A test playground")
                    .addStringOption((opt) => opt.setName("echo").setDescription("Message to echo").setRequired(true));
            },
            {
                idHints: ["closure-test", "1043216731168051241"],
                guildIds: ["688349293970849812", "339763195554299904"],
            }
        );
    }

    public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
        const message = interaction.options.getString("echo", true);
        const embed = new EmbedBuilder();
        embed.setTitle("Howling Blog").setURL("https://blog.howlingmoon.dev");
        embed.setDescription(`Howling Blog is a website created by Closure's author.
        It contains many good things, ||and also weeb things||.
        Did you know that Closure's repo is called [izuna](https://github.com/arung-agamani/izuna)?
        ||It's also a secret that Closure's author has art account over [twitter](https://twitter.com/shirayuk1haruka)`);
        return interaction.reply({
            content: message,
            embeds: [embed],
        });
    }

    public override async messageRun(message: Message) {
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
        const embed = new EmbedBuilder();
        embed.setTitle("Izuna: List of User's Playlist");
        if (!res.data.items || res.data.items.length === 0) {
            await message.channel.send("Searched through your Youtube account but found no playlist.");
            return;
        }
        for (const playlist of res.data.items!) {
            embed.addFields({ name: playlist.snippet?.title || "", value: `ID: ${playlist.id}` });
        }
        await message.channel.send({ embeds: [embed] });
    }
}
