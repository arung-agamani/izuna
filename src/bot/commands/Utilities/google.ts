import { Args, Command } from "@sapphire/framework";
import type { Message } from "discord.js";
import { config } from "../../../config";
import { closureGoogleOauthTracker } from "../../../lib/google";

export class GoogleLoginCommand extends Command {
    public constructor(context: Command.Context, options: Command.Options) {
        super(context, {
            ...options,
            name: "login",
            aliases: ["signin"],
            description: "Login using OAuth2.0 to authorize Closure using external resources on your behalf.",
        });
    }

    public async messageRun(message: Message, args: Args) {
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
