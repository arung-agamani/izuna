import { InteractionHandler, InteractionHandlerTypes, PieceContext } from "@sapphire/framework";
import { ButtonInteraction, Message, MessageEmbed } from "discord.js";
import { getKanaInstance, Kana } from "../../lib/kana";

export class VNDBInteractionHandler extends InteractionHandler {
    kana: Kana;
    public constructor(ctx: PieceContext, options: InteractionHandler.Options) {
        super(ctx, {
            ...options,
            interactionHandlerType: InteractionHandlerTypes.Button,
        });
        this.kana = getKanaInstance();
    }

    public async run(interaction: ButtonInteraction, vnId: string) {
        const vnInfo = await this.kana.vn.getInfo(["id", "=", vnId]);
        if (typeof vnInfo === "string") {
            return interaction.reply(`Error when fetching entry with id ${vnId}: ${vnInfo}`);
        }
        const entry = vnInfo.results[0];
        const tags = entry.tags.filter((x: any) => x.spoiler === 0 && x.rating >= 2);

        const embed = new MessageEmbed();
        embed.setTitle(entry.title);
        embed.setDescription(entry.description || "No data");
        if (entry.image.sexual == 0 && entry.image.violence == 0) embed.setImage(entry.image.url);
        embed.addField("Length", `${entry.length_minutes / 60} hour(s)`, true);
        embed.addField("Popularity", entry.popularity !== "" ? String(entry.rating) : "No data", true);
        embed.addField("Rating", entry.rating !== "" ? String(entry.rating) : "No data", true);
        embed.addField(
            "Tags (Content)",
            (
                tags
                    .filter((x: any) => x.category === "cont")
                    .map((x: any) => `\`${x.name}\``)
                    .join(" ") as string
            ).slice(0, 1023)
        );
        embed.setFooter({ text: `Click the title to open the page` });
        embed.setURL(`https://vndb.org/${entry.id}`);
        if (interaction.message instanceof Message) {
            interaction.deferUpdate();
            interaction.message.edit({ embeds: [embed] });
        } else {
            interaction.deferUpdate();
            await interaction.channel?.send({ embeds: [embed] });
        }
    }

    public async parse(interaction: ButtonInteraction) {
        if (!interaction.customId.startsWith("v")) return this.none();

        return this.some(interaction.customId);
    }
}
