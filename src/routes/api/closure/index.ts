import type { FastifyInstance, FastifyPluginOptions } from "fastify";
import { FastifyDiscordOAuthBody } from "../../..";
import prisma from "../../../lib/prisma";
import logger from "../../../lib/winston";
import discordOauth2 from "discord-oauth2";

import * as tagsHandler from "./tag";
import { PermissionsBitField } from "discord.js";
import discordSession, { GuildMembership } from "../../../lib/session";

export async function getUserGuilds(userId: string, oauth: discordOauth2, accessToken: string) {
    let guilds;
    guilds = discordSession.get(userId);
    if (guilds) return guilds;
    try {
        guilds = await oauth.getUserGuilds(accessToken);
        const tempGuilds: GuildMembership[] = [];
        for (const guild of guilds) {
            tempGuilds.push({
                name: guild.name,
                guildId: guild.id,
                isAdmin: new PermissionsBitField(guild.permissions as any).has(PermissionsBitField.Flags.Administrator),
                permissionInteger: guild.permissions!,
                guildPartial: guild,
            });
        }
        discordSession.set(userId, tempGuilds);
        return tempGuilds;
    } catch (error) {
        logger.error(`Error when fetching user ${userId} guilds`);
        return null;
    }
}

async function routes(fastify: FastifyInstance, _: FastifyPluginOptions) {
    fastify.get("/test", async (_req, _res) => {
        return {
            status: 200,
            message: "hello",
        };
    });

    fastify.get(
        "/user",
        {
            onRequest: [fastify.authenticate],
        },
        async (req, _res) => {
            return {
                message: "here will be baseline for user API",
                user: req.user,
            };
        }
    );

    fastify.get("/user/me", { onRequest: [fastify.authenticate] }, async (req, res) => {
        const user = await prisma.user.findUnique({ where: { id: req.user.id } });
        logger.debug("/user/me request for id " + req.user.id);
        if (!user) {
            res.code(404).send({
                message: "user not found",
            });
            return;
        }
        res.send({
            data: user,
        });
    });

    fastify.get("/user/me/guildsAll", { onRequest: [fastify.authenticate] }, async (req, res) => {
        const { user, token } = fastify.jwt.decode<FastifyDiscordOAuthBody>(req.cookies["ninpou"]!)!;
        const oauth = new discordOauth2();
        try {
            const guilds = await getUserGuilds(user.uid, oauth, token.access_token);
            if (!guilds)
                return res.status(500).send({
                    message: "Internal server error",
                });
            const guildsIds = guilds.map((x: GuildMembership) => x.guildId);
            const closureGuilds = await prisma.tag.findMany({
                where: {
                    guildId: { in: guildsIds },
                },
            });
            const filteredGuilds = guilds.filter((x) => {
                if (
                    closureGuilds.findIndex(
                        (y: typeof closureGuilds[0]) =>
                            y.guildId === x.guildId && new PermissionsBitField(x.permissionInteger as any).has(PermissionsBitField.Flags.SendMessages)
                    ) > -1
                )
                    return true;
                return false;
            });
            return res.send({
                count: guilds.length,
                guilds: filteredGuilds,
            });
        } catch (error) {
            logger.error("Error occured when doing /user/me/guildsAll");
            logger.error(error);
            return res.status(500).send({
                message: "Something went wrong",
            });
        }
    });

    fastify.get("/user/me/guilds", { onRequest: [fastify.authenticate] }, async (req, res) => {
        const { user, token } = fastify.jwt.decode<FastifyDiscordOAuthBody>(req.cookies["ninpou"]!)!;
        const oauth = new discordOauth2();
        try {
            const guilds = await getUserGuilds(user.uid, oauth, token.access_token);
            if (!guilds)
                return res.status(500).send({
                    message: "Internal server error",
                });
            const guildsIds = guilds.map((x: GuildMembership) => x.guildId);
            const closureGuilds = await prisma.tag.findMany({
                where: {
                    guildId: { in: guildsIds },
                },
            });
            const filteredGuilds = guilds.filter((x) => {
                if (
                    closureGuilds.findIndex(
                        (y: typeof closureGuilds[0]) =>
                            y.guildId === x.guildId && new PermissionsBitField(x.permissionInteger as any).has(PermissionsBitField.Flags.Administrator)
                    ) > -1
                )
                    return true;
                return false;
            });
            return res.send({
                count: guilds.length,
                guilds: filteredGuilds,
            });
        } catch (error) {
            logger.error("Error occured when doing /user/me/guilds");
            logger.error(error);
            return res.status(500).send({
                message: "Something went wrong",
            });
        }
    });

    fastify.get(
        "/user/reminder",
        {
            onRequest: [
                /* fastify.authenticate */
            ],
        },
        async (req, _res) => {
            const decodedValue = fastify.jwt.decode<{ uid: string }>(req.cookies["ninpou"]!)!;
            const userReminder = await prisma.reminder.findMany({
                where: {
                    uid: decodedValue.uid,
                },
            });
            return {
                data: userReminder,
            };
        }
    );

    fastify.get("/tags/me", { onRequest: [fastify.authenticate] }, tagsHandler.get);
    fastify.patch("/tags/me/:id", { onRequest: [fastify.authenticate] }, tagsHandler.patch);
    fastify.delete("/tags/me/:id", { onRequest: [fastify.authenticate] }, tagsHandler.del);

    fastify.get("/tags/me/guilds/:id", { onRequest: [fastify.authenticate] }, tagsHandler.getGuildTags);
    fastify.delete("/tags/me/guilds/:guildId/:id", { onRequest: [fastify.authenticate] }, tagsHandler.delFromGuild);
}

export default routes;
