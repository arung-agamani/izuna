import { Listener } from "@sapphire/framework";
import type { Client } from "discord.js";

export class ReadyListener extends Listener {
    public constructor(context: Listener.Context, options: Listener.Options) {
        super(context, {
            ...options,
            once: true,
            event: "ready",
        });
    }

    public run(client: Client) {
        const botUser = client.user!;
        botUser.setActivity(
            `Type ${
                process.env["NODE_ENV"] === "development"
                    ? "cdev! help"
                    : "closure! help"
            } for getting help`
        );
    }
}
