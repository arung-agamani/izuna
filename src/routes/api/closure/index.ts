import type { FastifyInstance, FastifyPluginOptions } from "fastify";
import prisma from "../../../lib/prisma";
import logger, { logError } from "../../../lib/winston";
import discordOauth2 from "discord-oauth2";

import * as tagsHandler from "./tag";
import { PermissionsBitField } from "discord.js";
import discordSession, { GuildMembership, discordAccessTokens } from "../../../lib/session";
import UserService from "../../../services/UserService";
import { UserRepository } from "../../../repositories/UserRepository";
import { TagService } from "../../../services/TagService";
const tagService = TagService.getInstance();
const userRepo = new UserRepository(prisma);


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
        logError(`Error fetching guilds for user ${userId}`, error);
        return null;
    }
}

async function routes(fastify: FastifyInstance, _: FastifyPluginOptions) {

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
        },
    );

    fastify.get("/user/me", { onRequest: [fastify.authenticate] }, async (req, res) => {
        const user = await UserService.getInstance().getUserById(req.user.id);
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

    fastify.get<{ Querystring: { filter?: string } }>("/user/me/guilds", { onRequest: [fastify.authenticate] }, async (req, res) => {
        const filter = req.query.filter === "admin" ? "admin" : "sendMessages";

        let tokenEntry = discordAccessTokens.get(req.user.uid);
        if (!tokenEntry) {
            const user = await userRepo.findByUid(req.user.uid);
            if (!user?.discordAccessToken) return res.status(401).send({ message: "Discord session expired. Please re-login." });
            tokenEntry = { access_token: user.discordAccessToken, refresh_token: user.discordRefreshToken || "", expires_at: 0 };
            discordAccessTokens.set(req.user.uid, tokenEntry);
        }

        const oauth = new discordOauth2();
        try {
            const guilds = await getUserGuilds(req.user.uid, oauth, tokenEntry.access_token);
            if (!guilds) return res.status(500).send({ message: "Internal server error" });

            const guildsIds = guilds.map((x: GuildMembership) => x.guildId);
            const closureGuilds = await tagService.findGuildsWithTags(guildsIds);

            const requiredFlag = filter === "admin" ? PermissionsBitField.Flags.Administrator : PermissionsBitField.Flags.SendMessages;
            const filteredGuilds = guilds.filter((x) =>
                closureGuilds.some((y) => y.guildId === x.guildId && new PermissionsBitField(x.permissionInteger as unknown as bigint).has(requiredFlag)),
            );

            return res.send({ count: guilds.length, guilds: filteredGuilds });
        } catch (error) {
            logError("Error fetching user guilds", error, { userId: req.user.uid });
            return res.status(500).send({ message: "Something went wrong" });
        }
    });


    fastify.get("/tags/me", { onRequest: [fastify.authenticate] }, tagsHandler.get);
    fastify.patch("/tags/me/:id", { onRequest: [fastify.authenticate] }, tagsHandler.patch);
    fastify.delete("/tags/me/:id", { onRequest: [fastify.authenticate] }, tagsHandler.del);

    fastify.get("/tags/me/guilds/:id", { onRequest: [fastify.authenticate] }, tagsHandler.getGuildTags);
    fastify.delete("/tags/me/guilds/:guildId/:id", { onRequest: [fastify.authenticate] }, tagsHandler.delFromGuild);
}

export default routes;
