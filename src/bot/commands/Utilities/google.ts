import { Args, ChatInputCommand, Command } from "@sapphire/framework";
import type { Message } from "discord.js";
import { config } from "../../../config";
import { closureGoogleOauthTracker } from "../../../lib/google";

export class GoogleLoginCommand extends Command {
    public constructor(context: Command.Context, options: Command.Options) {
        super(context, {
            ...options,
            name: "login",
            aliases: ["signin"],
            description: "Login using OAuth2.0 to authorize Izuna using external resources on your behalf.",
        });
    }

    public override registerApplicationCommands(registry: ChatInputCommand.Registry) {
        registry.registerChatInputCommand(
            (builder) => {
                builder
                    .setName("login")
                    .setDescription("Connect Izuna to various services")
                    .addStringOption((opt) =>
                        opt.setName("service").setDescription("Service to connect Izuna with").addChoices({ name: "Google", value: "google" }).setRequired(true)
                    );
            },
            {
                idHints: ["closure-login", "1043216731168051241"],
            }
        );
    }

    public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
        const message = interaction.options.getString("service", true);
        if (message === "google") {
            const userOauthState = closureGoogleOauthTracker.get(interaction.user.id);
            if (!userOauthState) {
                await interaction.reply({
                    content: "Login link has sent to your DM",
                });
                await interaction.user.send(`${config.domainPrefix}/api/auth/google?source=closure&uid=${interaction.user.id}`);
                return;
            } else {
                await interaction.reply({ content: `You've already logged in. More details sent to your DM` });
                await interaction.user.send(`You've already logged in. The current session is valid for the next ${userOauthState.expires_in} seconds`);
                return;
            }
        }
        return interaction.reply({
            content: `Invalid option`,
        });
    }

    public override async messageRun(message: Message, args: Args) {
        const arg1 = await args.pick("string");
        if (arg1 === "google") {
            const userOauthState = closureGoogleOauthTracker.get(message.author.id);
            if (!userOauthState) {
                await message.channel.send("Login link has sent to your DM");
                await message.author.send(`${config.domainPrefix}/api/auth/google?source=closure&uid=${message.author.id}`);
                return;
            } else {
                await message.channel.send(`You've already logged in. The current session is valid for the next ${userOauthState.expires_in} seconds`);
                return;
            }
        } else {
            await message.channel.send(`Invalid argument to command`);
            return;
        }
    }
}
