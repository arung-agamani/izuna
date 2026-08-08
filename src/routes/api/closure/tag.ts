import type { FastifyReply, FastifyRequest } from "fastify";
import DiscordOAuth2 from "discord-oauth2";
import logger, { logError } from "../../../lib/winston";
import discordSession from "../../../lib/session";
import { TagService } from "../../../services/TagService";

const tagService = TagService.getInstance();

export async function get(req: FastifyRequest, res: FastifyReply) {
    const tags = await tagService.list({ type: "user", userId: req.user!.uid });

    logger.debug(`Sent request for id ${req.user!.uid} with count ${tags.length}`);
    return res.send({ count: tags.length, tags });
}

export async function getGuildTags(req: FastifyRequest, res: FastifyReply) {
    const { id } = req.params as { id: string };
    const guilds = discordSession.get(req.user!.uid);
    if (!guilds || guilds.findIndex((x) => x.guildId === id) === -1) {
        return res.status(403).send({ message: "You cannot fetch other guild's tag as you're not a member of it" });
    }

    const tags = await tagService.list({ type: "guild", guildId: id });

    if (tags.length === 0) {
        return res.status(404).send({ message: "No tags found on given guildId" });
    }

    return res.send({ count: tags.length, tags });
}

interface ModifyTagRequest {
    userId: string;
    guildId: string;
    content: string;
    isGuild: boolean;
}

export async function patch(req: FastifyRequest, reply: FastifyReply) {
    const { userId, guildId, isGuild, content } = req.body as ModifyTagRequest;
    const { id } = req.params as { id: string };
    if (!(id && userId && guildId && content) || isNaN(Number(id))) {
        return reply.status(400).send({ message: "Bad request" });
    }

    if (content.length > 2000) {
        return reply.status(413).send({ message: "Content is too large (max 2000 characters)" });
    }

    try {
        // Verify ownership and type before updating
        const existing = await tagService.getById(Number(id));
        if (!existing || existing.userId !== userId || existing.guildId !== (isGuild ? guildId : "") || existing.isGuild !== isGuild || existing.isMedia) {
            return reply.status(404).send({ message: "No tag found with specified id" });
        }

        const tag = await tagService.updateContent(Number(id), content);
        return reply.status(200).send({ message: "Tag updated", tag });
    } catch (error) {
        logError("Tag update failed", error);
        return reply.status(404).send({ message: "No tag found with specified id" });
    }
}

export async function del(req: FastifyRequest, reply: FastifyReply) {
    const { id } = req.params as { id: string };
    if (!id || isNaN(Number(id))) {
        return reply.status(400).send({ message: "Bad request" });
    }

    try {
        const existing = await tagService.getById(Number(id));
        if (!existing || existing.userId !== req.user!.uid) {
            return reply.status(404).send({ message: "No tag found with given id" });
        }

        await tagService.deleteById(Number(id));
        return reply.status(200).send({ message: "Tag deleted" });
    } catch (error) {
        logError("Tag delete failed", error);
        return reply.status(404).send({ message: "No tag found with given id" });
    }
}

export async function delFromGuild(req: FastifyRequest, reply: FastifyReply) {
    const { id, guildId } = req.params as { id: string; guildId: string };
    if (!id || isNaN(Number(id))) {
        return reply.status(400).send({ message: "Bad request" });
    }

    const guilds = discordSession.get(req.user!.uid);
    if (!guilds || guilds.findIndex((x) => x.guildId === guildId && x.isAdmin) === -1) {
        return reply.status(403).send({ message: "You cannot delete other guild's tag as you're not an admin of it" });
    }

    try {
        const existing = await tagService.getById(Number(id));
        if (!existing || existing.guildId !== guildId) {
            return reply.status(404).send({ message: "No tag found with given id" });
        }

        await tagService.deleteById(Number(id));
        return reply.status(200).send({ message: "Tag deleted" });
    } catch (error) {
        logError("Guild tag delete failed", error);
        return reply.status(404).send({ message: "No tag found with given id" });
    }
}
