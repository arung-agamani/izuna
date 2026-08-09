import type { FastifyInstance, FastifyPluginOptions } from "fastify";
import { TagService } from "../../../services/TagService";
import ReminderService from "../../../services/ReminderService";
import { UserRepository } from "../../../repositories/UserRepository";
import prisma from "../../../lib/prisma";
import discordOauth2 from "discord-oauth2";
import discordSession, { GuildMembership, discordAccessTokens } from "../../../lib/session";
import { PermissionsBitField } from "discord.js";


const tagService = TagService.getInstance();
const userRepo = new UserRepository(prisma);
const reminderService = ReminderService.getInstance();

async function userRoutes(fastify: FastifyInstance, _opts: FastifyPluginOptions) {
    // ═══════════════════════════════════════════
    // /users/me/tags
    // ═══════════════════════════════════════════

    // GET /users/me/tags — list user's tags
    fastify.get("/me/tags", { onRequest: [fastify.authenticate] }, async (req, reply) => {
        const tags = await tagService.list({ type: "user", userId: req.user.uid });
        return reply.send({ data: tags, count: tags.length });
    });

    // POST /users/me/tags — create user tag
    fastify.post("/me/tags", { onRequest: [fastify.authenticate] }, async (req, reply) => {
        const { name, content, isMedia } = req.body as { name: string; content: string; isMedia?: boolean };

        if (!name || !content) {
            return reply.status(400).send({ error: "name and content are required" });
        }

        if (!tagService.validateName(name)) {
            return reply.status(400).send({ error: "Tag name must be alphanumeric (single word, no spaces or special characters)" });
        }

        if (content.length > 2000) {
            return reply.status(413).send({ error: "Content is too large (max 2000 characters)" });
        }

        const tag = await (isMedia
            ? tagService.upsertMediaTag({ type: "user", userId: req.user.uid }, name, content, req.user.uid)
            : tagService.upsertTextTag({ type: "user", userId: req.user.uid }, name, content, req.user.uid));

        return reply.status(201).send({ data: tag });
    });

    // GET /users/me/tags/:id — get single tag
    fastify.get("/me/tags/:id", { onRequest: [fastify.authenticate] }, async (req, reply) => {
        const { id } = req.params as { id: string };
        const tag = await tagService.getById(Number(id));

        if (!tag || tag.userId !== req.user.uid) {
            return reply.status(404).send({ error: "Tag not found" });
        }

        return reply.send({ data: tag });
    });

    // PATCH /users/me/tags/:id — update tag content
    fastify.patch("/me/tags/:id", { onRequest: [fastify.authenticate] }, async (req, reply) => {
        const { id } = req.params as { id: string };
        const { content } = req.body as { content: string };

        if (!content) {
            return reply.status(400).send({ error: "content is required" });
        }

        if (content.length > 2000) {
            return reply.status(413).send({ error: "Content is too large (max 2000 characters)" });
        }

        const existing = await tagService.getById(Number(id));
        if (!existing || existing.userId !== req.user.uid || existing.isMedia) {
            return reply.status(404).send({ error: "Tag not found or cannot be modified" });
        }

        const updated = await tagService.updateContent(Number(id), content);
        return reply.send({ data: updated });
    });

    // DELETE /users/me/tags/:id — delete user tag
    fastify.delete("/me/tags/:id", { onRequest: [fastify.authenticate] }, async (req, reply) => {
        const { id } = req.params as { id: string };

        const existing = await tagService.getById(Number(id));
        if (!existing || existing.userId !== req.user.uid) {
            return reply.status(404).send({ error: "Tag not found" });
        }

        await tagService.deleteById(Number(id));
        return reply.status(204).send();
    });

    // ═══════════════════════════════════════════
    // /users/me/reminders
    // ═══════════════════════════════════════════

    // GET /users/me/reminders — list user's reminders
    fastify.get("/me/reminders", { onRequest: [fastify.authenticate] }, async (req, reply) => {
        const reminders = await reminderService.listReminders({ userId: req.user.uid });
        return reply.send({ data: reminders, count: reminders.length });
    });

    // POST /users/me/reminders — create reminder
    fastify.post("/me/reminders", { onRequest: [fastify.authenticate] }, async (req, reply) => {
        const { message, cronString, channelType, channelId, guildId } = req.body as {
            message: string;
            cronString: string;
            channelType: "DM" | "CHANNEL";
            channelId: string;
            guildId?: string;
        };

        if (!message || !cronString || !channelType || !channelId) {
            return reply.status(400).send({ error: "message, cronString, channelType, and channelId are required" });
        }

        if (!reminderService.validateCronString(cronString)) {
            return reply.status(400).send({ error: "Invalid cron string" });
        }

        try {
            const reminder = await reminderService.createReminder({
                uid: req.user.uid,
                message,
                cronString,
                channelType,
                channelId,
                guildId,
            });
            return reply.status(201).send({ data: reminder });
        } catch (err) {
            return reply.status(400).send({ error: err instanceof Error ? err.message : "Failed to create reminder" });
        }
    });

    // GET /users/me/reminders/:id — get single reminder
    fastify.get("/me/reminders/:id", { onRequest: [fastify.authenticate] }, async (req, reply) => {
        const { id } = req.params as { id: string };
        const reminder = await reminderService.getReminderForUser(Number(id), req.user.uid);
        if (!reminder) {
            return reply.status(404).send({ error: "Reminder not found" });
        }
        return reply.send({ data: reminder });
    });

    // PATCH /users/me/reminders/:id — update reminder
    fastify.patch("/me/reminders/:id", { onRequest: [fastify.authenticate] }, async (req, reply) => {
        const { id } = req.params as { id: string };
        const body = req.body as Record<string, unknown>;

        const existing = await reminderService.getReminderForUser(Number(id), req.user.uid);
        if (!existing) {
            return reply.status(404).send({ error: "Reminder not found" });
        }

        try {
            const updated = await reminderService.updateReminder(Number(id), body);
            return reply.send({ data: updated });
        } catch (err) {
            return reply.status(400).send({ error: err instanceof Error ? err.message : "Failed to update reminder" });
        }
    });

    // DELETE /users/me/reminders/:id — delete reminder
    fastify.delete("/me/reminders/:id", { onRequest: [fastify.authenticate] }, async (req, reply) => {
        const { id } = req.params as { id: string };

        const existing = await reminderService.getReminderForUser(Number(id), req.user.uid);
        if (!existing) {
            return reply.status(404).send({ error: "Reminder not found" });
        }

        await reminderService.deleteReminder(Number(id));
        return reply.status(204).send();
    });

    // GET /users/me/reminders/stats — reminder statistics
    fastify.get("/me/reminders/stats", { onRequest: [fastify.authenticate] }, async (req, reply) => {
        const reminders = await reminderService.listReminders({ userId: req.user.uid });
        return reply.send({ data: { total: reminders.length } });
    });

    // ═══════════════════════════════════════════
    // /users/me/guilds
    // ═══════════════════════════════════════════

    fastify.get<{ Querystring: { filter?: string } }>("/me/guilds", { onRequest: [fastify.authenticate] }, async (req, reply) => {
        const filter = req.query.filter === "admin" ? "admin" : "sendMessages";

        let tokenEntry = discordAccessTokens.get(req.user.uid);
        if (!tokenEntry) {
            const user = await userRepo.findByUid(req.user.uid);
            if (!user?.discordAccessToken) {
                return reply.status(401).send({ error: "Discord session expired. Please re-login." });
            }
            tokenEntry = { access_token: user.discordAccessToken, refresh_token: user.discordRefreshToken || "", expires_at: 0 };
            discordAccessTokens.set(req.user.uid, tokenEntry);
        }

        const oauth = new discordOauth2();
        let guilds = discordSession.get(req.user.uid);
        if (!guilds) {
            try {
                const raw = await oauth.getUserGuilds(tokenEntry.access_token);
                guilds = raw.map((g) => ({
                    name: g.name,
                    guildId: g.id,
                    isAdmin: new PermissionsBitField(BigInt(g.permissions ?? 0)).has(PermissionsBitField.Flags.Administrator),
                    permissionInteger: g.permissions ?? 0,
                    guildPartial: g,
                }));
                discordSession.set(req.user.uid, guilds);
            } catch {
                return reply.status(502).send({ error: "Failed to fetch guilds from Discord" });
            }
        }

        const guildIds = guilds.map((g) => g.guildId);
        const closureGuilds = await tagService.findGuildsWithTags(guildIds);
        const requiredFlag = filter === "admin" ? PermissionsBitField.Flags.Administrator : PermissionsBitField.Flags.SendMessages;

        const filtered = guilds.filter(
            (g) => closureGuilds.some((c) => c.guildId === g.guildId && new PermissionsBitField(BigInt(g.permissionInteger)).has(requiredFlag)),
        );

        return reply.send({ data: filtered, count: filtered.length });
    });
}

export default userRoutes;
