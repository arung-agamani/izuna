import { InteractionHandler, InteractionHandlerTypes, PieceContext } from "@sapphire/framework";
import {
    ButtonInteraction,
    Message,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    StringSelectMenuInteraction,
    Interaction,
    StringSelectMenuBuilder,
} from "discord.js";
import { getKanaInstance, Kana } from "../../lib/kana";
import { SearchCharacterResult } from "../../lib/kana/collections/chara";
import logger from "../../lib/winston";
import { addInteractionEntry, debounceInteraction } from "../../lib/interactionTimeout";

export class VNDBInteractionHandler extends InteractionHandler {
    kana: Kana;
    public constructor(ctx: PieceContext, options: InteractionHandler.Options) {
        super(ctx, {
            ...options,
            interactionHandlerType: InteractionHandlerTypes.Button,
        });
        this.kana = getKanaInstance();
    }

    public async run(interaction: ButtonInteraction, parsedData: InteractionHandler.ParseResult<this>) {
        if (parsedData.type === "vn") {
            const vnInfo = await this.kana.vn.getInfo(["id", "=", parsedData.id]);
            if (typeof vnInfo === "string") {
                return interaction.reply(`Error when fetching entry with id ${parsedData.id}: ${vnInfo}`);
            }
            const entry = vnInfo.results[0];
            const tags = entry.tags.filter((x: any) => x.spoiler === 0 && x.rating >= 2);

            const embed = new EmbedBuilder();
            embed.setTitle(entry.title);
            embed.setDescription(entry.description || "No data");
            if (entry.image.sexual == 0 && entry.image.violence == 0) embed.setImage(entry.image.url);
            embed.addFields({ name: "Length", value: `${entry.length_minutes / 60} hour(s)`, inline: true });
            embed.addFields({ name: "Popularity", value: entry.popularity !== "" ? String(entry.rating) : "No data", inline: true });
            embed.addFields({ name: "Rating", value: entry.rating !== "" ? String(entry.rating) : "No data", inline: true });
            embed.addFields({
                name: "Tags (Content)",
                value: (
                    tags
                        .filter((x: any) => x.category === "cont")
                        .map((x: any) => `\`${x.name}\``)
                        .join(" ") as string
                ).slice(0, 1023),
            });
            embed.setFooter({ text: `Click the title to open the page` });
            embed.setURL(`https://vndb.org/${entry.id}`);
            const infoActionRow = new ActionRowBuilder<ButtonBuilder>();
            infoActionRow.addComponents(
                new ButtonBuilder()
                    .setLabel("Characters")
                    .setCustomId("info-chara-" + entry.id)
                    .setStyle(ButtonStyle.Secondary)
            );
            if (interaction.message instanceof Message) {
                interaction.deferUpdate();
                interaction.message.edit({ embeds: [embed], components: [infoActionRow], content: "" });
                debounceInteraction(interaction.message.id);
            } else {
                interaction.deferUpdate();
                const sentMessage = await interaction.channel?.send({ embeds: [embed], components: [infoActionRow], content: "" });
                if (sentMessage) {
                    addInteractionEntry(sentMessage.id, () => {
                        sentMessage.edit({ embeds: sentMessage.embeds, components: undefined });
                    });
                }
            }
        } else if (parsedData.type === "chara") {
            const charaId = parsedData.id;
            const charaInfo = await this.kana.chara.getCharacterById(charaId);
            if (charaInfo && charaInfo.results.length === 1) this.showCharacter(interaction, charaInfo.results[0]);
        } else if (parsedData.type === "vn-chara") {
            const vnId = parsedData.id;
            const charaInfo = await this.kana.chara.getVNCharacters(vnId);
            const embed = new EmbedBuilder();
            const actionRow = new ActionRowBuilder<StringSelectMenuBuilder>();
            actionRow.addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId("select")
                    .setPlaceholder("Select character to implore")
                    .addOptions(
                        ...charaInfo.results.map((chara: any) => ({
                            label: chara.name,
                            description: chara.vns[0].title,
                            value: chara.id,
                        }))
                    )
            );
            embed.setTitle(`Search returned ${charaInfo.results.length} character(s) Only showing top 5 result`);
            interaction.deferUpdate();
            interaction.message.edit({ embeds: [embed], components: [actionRow], content: "" });
            debounceInteraction(interaction.message.id);
        }
    }

    public async parse(interaction: ButtonInteraction) {
        logger.debug(`Received interaction with custom id: ${interaction.customId}`);
        if (interaction.customId.startsWith("v")) {
            return this.some({
                type: "vn",
                id: interaction.customId,
            });
        } else if (interaction.customId.startsWith("c")) {
            return this.some({
                type: "chara",
                id: interaction.customId,
            });
        } else if (interaction.customId.startsWith("info")) {
            const [, category, id] = interaction.customId.split("-");
            if (category === "chara") {
                return this.some({
                    type: "vn-chara",
                    id: id,
                });
            } else {
                return this.none();
            }
        } else {
            return this.none();
        }
    }

    public async showCharacter(interaction: ButtonInteraction, chara: SearchCharacterResult) {
        const embed = new EmbedBuilder();
        embed.setTitle(chara.name);
        embed.setDescription(chara.description);
        embed.setURL(`https://vndb.org/${chara.id}`);
        chara.vns.forEach((vn) => {
            embed.addFields({ name: "Appearance(s)", value: vn.title });
        });
        embed.setImage(chara.image.url);
        try {
            interaction.deferUpdate();
            interaction.message.edit({ embeds: [embed], components: [] });
            debounceInteraction(interaction.message.id);
        } catch (error) {
            logger.error(error);
        }
    }
}
