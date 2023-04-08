import type { FastifyReply, FastifyRequest } from "fastify";
import DiscordOAuth2 from "discord-oauth2";
import prisma from "../../../lib/prisma";
import logger from "../../../lib/winston";
import { FastifyDiscordOAuthBody } from "../../..";
import discordSession from "../../../lib/session";

const oauth = new DiscordOAuth2();

export async function get(req: FastifyRequest, res: FastifyReply) {
    const fastify = req.server;
    const decodedValue = fastify.jwt.decode(req.cookies["ninpou"]!) as any;
    console.log(decodedValue);
    const tags = await prisma.tag.findMany({
        where: {
            userId: decodedValue.user.uid,
        },
    });

    if (tags.length === 0) {
        return res.status(404).send({
            message: "No tags found with given id",
        });
    }

    const payload = {
        count: tags.length,
        tags,
    };
    logger.debug(`Sent request for id ${decodedValue.uid} with count ${tags.length}`);
    return res.send(payload);
}

export async function getGuildTags(req: FastifyRequest, res: FastifyReply) {
    const fastify = req.server;
    const { id } = req.params as { id: string };
    const { user } = fastify.jwt.decode<FastifyDiscordOAuthBody>(req.cookies["ninpou"]!)!;
    const guilds = discordSession.get(user.uid);
    if (!guilds || guilds.findIndex((x) => x.guildId === id) === -1)
        return res.status(403).send({
            message: "You cannot fetch other guild's tag as you're not a member of it",
        });
    const tags = await prisma.tag.findMany({
        where: {
            guildId: id,
        },
    });

    if (tags.length === 0) {
        return res.status(404).send({
            message: "No tags found on given guildId",
        });
    }

    return res.send({
        count: tags.length,
        tags,
    });
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
    if (!(id && userId && guildId && isGuild && content) && !isNaN(Number(id)))
        return reply.status(400).send({
            message: "Bad request",
        });

    if (content.length > 2000)
        return reply.status(413).send({
            message: "Content is too large (max 2000 characters)",
        });

    try {
        const tag = await prisma.tag.update({
            where: {
                id: Number(id),
                userId,
                guildId: isGuild ? guildId : "",
                isGuild,
                isMedia: false,
            },
            data: {
                message: content,
            },
        });
        return reply.status(200).send({
            message: "Tag updated",
            tag,
        });
    } catch (error) {
        return reply.status(404).send({
            message: "No tag found with specified id",
        });
    }
}

export async function del(req: FastifyRequest, reply: FastifyReply) {
    const { id } = req.params as { id: string };
    if (!id || isNaN(Number(id)))
        return reply.status(400).send({
            message: "Bad request",
        });

    const fastify = req.server;
    const { user } = fastify.jwt.decode(req.cookies["ninpou"]!) as any;
    try {
        await prisma.tag.delete({
            where: {
                id: Number(id),
                userId: user.uid,
            },
        });
        return reply.status(200).send({
            message: "Tag deleted",
        });
    } catch (error) {
        logger.error(error);
        return reply.status(404).send({
            message: "No tag found with given id",
        });
    }
}

export async function delFromGuild(req: FastifyRequest, reply: FastifyReply) {
    const { id, guildId } = req.params as { id: string; guildId: string };
    if (!id || isNaN(Number(id)))
        return reply.status(400).send({
            message: "Bad request",
        });

    const fastify = req.server;
    const { user } = fastify.jwt.decode<FastifyDiscordOAuthBody>(req.cookies["ninpou"]!)!;
    const guilds = discordSession.get(user.uid);
    if (!guilds || guilds.findIndex((x) => x.guildId === guildId && x.isAdmin) === -1)
        return reply.status(403).send({
            message: "You cannot delete other guild's tag as you're not an admin of it",
        });
    try {
        await prisma.tag.delete({
            where: {
                id: Number(id),
                guildId: guildId,
            },
        });
        return reply.status(200).send({
            message: "Tag deleted",
        });
    } catch (error) {
        logger.error(error);
        return reply.status(404).send({
            message: "No tag found with given id",
        });
    }
}
