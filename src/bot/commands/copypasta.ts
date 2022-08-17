import { Command } from "@sapphire/framework";
import type { Message } from "discord.js";
import axios from "../../lib/axios";
import type { AxiosResponse } from "axios";

interface WangyCopypastaTag {
    key: string;
    display_value: string;
    defaultValue: string;
    value: string;
}

interface WangyResponse {
    id: string;
    judul: string;
    deskripsi: string;
    input: string;
    tags: Array<WangyCopypastaTag>;
}

export class CopyPastaCommand extends Command {
    public constructor(context: Command.Context, options: Command.Options) {
        super(context, {
            ...options,
            name: "copypasta",
            aliases: [""],

            description:
                "Gives random copypasta. Viewer discretion advised. Also not accepting arguments currently,..nyaa",
        });
    }

    public async messageRun(message: Message) {
        if (message.author.id !== "145558597424644097") {
            await message.channel.send("Bot owner level feature, for now...");
            return;
        }
        const wangyRes = await axios.get<{}, AxiosResponse<WangyResponse[]>>(
            "https://wangy.howlingmoon.dev/api/wangy"
        );
        const validCopypastas = wangyRes.data.filter((item) => {
            if (item.tags.length === 0) return true;
            else return false;
        });
        await message.channel.send(
            (
                validCopypastas[
                    Math.floor(Math.random() * validCopypastas.length)
                ]!.input as string
            ).substring(0, 2000)
        );
        return;
    }
}
