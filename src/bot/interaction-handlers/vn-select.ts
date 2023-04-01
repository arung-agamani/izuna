import { InteractionHandler, InteractionHandlerTypes, PieceContext } from "@sapphire/framework";
import { EmbedBuilder, StringSelectMenuInteraction } from "discord.js";
import { getKanaInstance, Kana } from "../../lib/kana";
import { SearchCharacterResult } from "../../lib/kana/collections/chara";
import logger from "../../lib/winston";

export class VNDBSelectInteractionHandler extends InteractionHandler {
    kana: Kana;
    public constructor(ctx: PieceContext, options: InteractionHandler.Options) {
        super(ctx, {
            ...options,
            interactionHandlerType: InteractionHandlerTypes.SelectMenu,
        });
        this.kana = getKanaInstance();
    }

    public async run(interaction: StringSelectMenuInteraction, parsedData: InteractionHandler.ParseResult<this>) {
        const charaInfo = await this.kana.chara.getCharacterById(parsedData.id);
        if (charaInfo && charaInfo.results.length === 1) this.showCharacter(interaction, charaInfo.results[0]);
    }

    public async parse(interaction: StringSelectMenuInteraction) {
        logger.debug(`Received select menu interaction with customId: ${interaction.customId}`);
        const value = interaction.values[0];
        return this.some({
            type: interaction.customId,
            id: value,
        });
    }

    public async showCharacter(interaction: StringSelectMenuInteraction, chara: SearchCharacterResult) {
        const embed = new EmbedBuilder();
        embed.setTitle(chara.name);
        embed.setDescription(this.censor(chara.description));
        embed.setURL(`https://vndb.org/${chara.id}`);
        chara.vns.forEach((vn) => {
            embed.addFields({ name: "Appearance(s)", value: vn.title });
        });
        embed.setImage(chara.image.url);
        try {
            interaction.deferUpdate();
            interaction.message.edit({ embeds: [embed] });
        } catch (error) {
            logger.error(error);
        }
    }

    public censor(data: string) {
        let out = data;
        // link
        out = out.replace(/\[url=(\S+)\]([\w'’ -!]+)\[\/url\]/g, "[$2]($1)");
        // spoiler
        out = out.replace(/\[spoiler\]/gm, "||");
        out = out.replace(/\[\/spoiler\]/gm, "||");
        // add absolute url
        out = out.replace(/\]\(\//gm, "](https://vndb.org/");
        return out;
    }
}
