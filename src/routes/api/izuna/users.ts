import type { FastifyInstance, FastifyPluginOptions } from "fastify";
import { TagService } from "../../../services/TagService.js";
import ReminderService from "../../../services/ReminderService.js";
import { UserRepository } from "../../../repositories/UserRepository.js";
import { getBotClient } from "../../../lib/botClient.js";
import prisma from "../../../lib/prisma.js";
import discordOauth2 from "discord-oauth2";
import discordSession, { discordAccessTokens } from "../../../lib/session.js";
import { PermissionsBitField } from "discord.js";
const tagService = TagService.getInstance();
const reminderService = ReminderService.getInstance();
const userRepo = new UserRepository(prisma);

const TagResponse = {
    type: "object",
    properties: {
        id: { type: "number" },
        userId: { type: "string" },
        guildId: { type: ["string", "null"] },
        name: { type: "string" },
        createdAt: { type: "string" },
        message: { type: "string" },
        isMedia: { type: "boolean" },
        isGuild: { type: "boolean" },
    },
};

const ReminderResponse = {
    type: "object",
    properties: {
        id: { type: "number" },
        uid: { type: "string" },
        message: { type: "string" },
        cronString: { type: "string" },
        guildId: { type: ["string", "null"] },
        channelId: { type: "string" },
        channelType: { type: "string" },
    },
};

const ErrorResponse = { type: "object", properties: { error: { type: "string" } } };
const DataArrayResponse = (item: Record<string, unknown>) => ({
    type: "object",
    properties: { data: { type: "array", items: item }, count: { type: "number" } },
});
const DataResponse = (item: Record<string, unknown>) => ({
    type: "object",
    properties: { data: item },
});

async function userRoutes(fastify: FastifyInstance, _opts: FastifyPluginOptions) {
    // ═══════════════════════════════════════════
    // /users/me/tags
    // ═══════════════════════════════════════════

    fastify.get("/me/tags", {
        onRequest: [fastify.authenticate],
        schema: { description: "List the authenticated user's tags.", tags: ["tags"], response: { 200: DataArrayResponse(TagResponse) } },
    }, async (req, reply) => {
        const tags = await tagService.list({ type: "user", userId: req.user.uid });
        return reply.send({ data: tags, count: tags.length });
    });

    fastify.post("/me/tags", {
        onRequest: [fastify.authenticate],
        schema: {
            description: "Create a user-scoped tag.",
            tags: ["tags"],
            response: { 201: DataResponse(TagResponse), 400: ErrorResponse, 413: ErrorResponse },
        },
    }, async (req, reply) => {
        const { name, content, isMedia } = req.body as { name: string; content: string; isMedia?: boolean };
        if (!name || !content) return reply.status(400).send({ error: "name and content are required" });
        if (!tagService.validateName(name)) return reply.status(400).send({ error: "Tag name must be alphanumeric (single word, no spaces or special characters)" });
        if (content.length > 2000) return reply.status(413).send({ error: "Content is too large (max 2000 characters)" });

        const tag = isMedia
            ? await tagService.upsertMediaTag({ type: "user", userId: req.user.uid }, name, content, req.user.uid)
            : await tagService.upsertTextTag({ type: "user", userId: req.user.uid }, name, content, req.user.uid);
        return reply.status(201).send({ data: tag });
    });

    fastify.get("/me/tags/:id", {
        onRequest: [fastify.authenticate],
        schema: { description: "Get a single user tag.", tags: ["tags"], response: { 200: DataResponse(TagResponse), 404: ErrorResponse } },
    }, async (req, reply) => {
        const { id } = req.params as { id: string };
        const tag = await tagService.getById(Number(id));
        if (!tag || tag.userId !== req.user.uid) return reply.status(404).send({ error: "Tag not found" });
        return reply.send({ data: tag });
    });

    fastify.patch("/me/tags/:id", {
        onRequest: [fastify.authenticate],
        schema: { description: "Update a tag's content.", tags: ["tags"], response: { 200: DataResponse(TagResponse), 400: ErrorResponse, 404: ErrorResponse, 413: ErrorResponse } },
    }, async (req, reply) => {
        const { id } = req.params as { id: string };
        const { content } = req.body as { content: string };
        if (!content) return reply.status(400).send({ error: "content is required" });
        if (content.length > 2000) return reply.status(413).send({ error: "Content is too large (max 2000 characters)" });

        const existing = await tagService.getById(Number(id));
        if (!existing || existing.userId !== req.user.uid || existing.isMedia) return reply.status(404).send({ error: "Tag not found or cannot be modified" });

        const updated = await tagService.updateContent(Number(id), content);
        return reply.send({ data: updated });
    });

    fastify.delete("/me/tags/:id", {
        onRequest: [fastify.authenticate],
        schema: { description: "Delete a user tag.", tags: ["tags"], response: { 204: { type: "null" }, 404: ErrorResponse } },
    }, async (req, reply) => {
        const { id } = req.params as { id: string };
        const existing = await tagService.getById(Number(id));
        if (!existing || existing.userId !== req.user.uid) return reply.status(404).send({ error: "Tag not found" });
        await tagService.deleteById(Number(id));
        return reply.status(204).send();
    });

    // ═══════════════════════════════════════════
    // /users/me/reminders
    // ═══════════════════════════════════════════

    fastify.get("/me/reminders", {
        onRequest: [fastify.authenticate],
        schema: { description: "List the authenticated user's reminders.", tags: ["reminders"], response: { 200: DataArrayResponse(ReminderResponse) } },
    }, async (req, reply) => {
        const reminders = await reminderService.listReminders({ userId: req.user.uid });
        return reply.send({ data: reminders, count: reminders.length });
    });

    fastify.post("/me/reminders", {
        onRequest: [fastify.authenticate],
        schema: { description: "Create a reminder.", tags: ["reminders"], response: { 201: DataResponse(ReminderResponse), 400: ErrorResponse } },
    }, async (req, reply) => {
        const { message, cronString, channelType, channelId, guildId } = req.body as {
            message: string; cronString: string; channelType: "DM" | "CHANNEL"; channelId: string; guildId?: string;
        };
        if (!message || !cronString || !channelType || !channelId) return reply.status(400).send({ error: "message, cronString, channelType, and channelId are required" });
        if (!reminderService.validateCronString(cronString)) return reply.status(400).send({ error: "Invalid cron string" });

        const reminder = await reminderService.createReminder({ uid: req.user.uid, message, cronString, channelType, channelId, guildId });
        return reply.status(201).send({ data: reminder });
    });

    fastify.get("/me/reminders/:id", {
        onRequest: [fastify.authenticate],
        schema: { description: "Get a single reminder.", tags: ["reminders"], response: { 200: DataResponse(ReminderResponse), 404: ErrorResponse } },
    }, async (req, reply) => {
        const { id } = req.params as { id: string };
        const reminder = await reminderService.getReminderForUser(Number(id), req.user.uid);
        if (!reminder) return reply.status(404).send({ error: "Reminder not found" });
        return reply.send({ data: reminder });
    });

    fastify.patch("/me/reminders/:id", {
        onRequest: [fastify.authenticate],
        schema: { description: "Update a reminder.", tags: ["reminders"], response: { 200: DataResponse(ReminderResponse), 400: ErrorResponse, 404: ErrorResponse } },
    }, async (req, reply) => {
        const { id } = req.params as { id: string };
        const existing = await reminderService.getReminderForUser(Number(id), req.user.uid);
        if (!existing) return reply.status(404).send({ error: "Reminder not found" });
        const updated = await reminderService.updateReminder(Number(id), req.body as Record<string, unknown>);
        return reply.send({ data: updated });
    });

    fastify.delete("/me/reminders/:id", {
        onRequest: [fastify.authenticate],
        schema: { description: "Delete a reminder.", tags: ["reminders"], response: { 204: { type: "null" }, 404: ErrorResponse } },
    }, async (req, reply) => {
        const { id } = req.params as { id: string };
        const existing = await reminderService.getReminderForUser(Number(id), req.user.uid);
        if (!existing) return reply.status(404).send({ error: "Reminder not found" });
        await reminderService.deleteReminder(Number(id));
        return reply.status(204).send();
    });

    fastify.get("/me/reminders/stats", {
        onRequest: [fastify.authenticate],
        schema: {
            description: "Get reminder count for the authenticated user.",
            tags: ["reminders"],
            response: { 200: { type: "object", properties: { data: { type: "object", properties: { total: { type: "number" } } } } } },
        },
    }, async (req, reply) => {
        const reminders = await reminderService.listReminders({ userId: req.user.uid });
        return reply.send({ data: { total: reminders.length } });
    });

    // ═══════════════════════════════════════════
    // /users/me/guilds
    // ═══════════════════════════════════════════

    fastify.get<{ Querystring: { filter?: string } }>("/me/guilds", {
        onRequest: [fastify.authenticate],
        schema: {
            description: "List Discord guilds the user belongs to that have Izuna installed.",
            tags: ["guilds"],
            querystring: { type: "object", properties: { filter: { type: "string", enum: ["admin", "sendMessages"] } } },
            response: {
                200: {
                    type: "object",
                    properties: {
                        data: { type: "array", items: { type: "object", additionalProperties: true } },
                        count: { type: "number" },
                    },
                },
            },
        },
    }, async (req, reply) => {
        const filter = req.query.filter === "admin" ? "admin" : "sendMessages";

        let tokenEntry = discordAccessTokens.get(req.user.uid);
        if (!tokenEntry) {
            const user = await userRepo.findByUid(req.user.uid);
            if (!user?.discordAccessToken) return reply.status(401).send({ error: "Discord session expired. Please re-login." });
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
        // Intersect with guilds the bot is actually in
        const botClient = getBotClient();
        const botGuildIds = botClient ? new Set(botClient.guilds.cache.keys()) : new Set<string>();
        const shared = guilds.filter((g) => botGuildIds.has(g.guildId));

        const requiredFlag = filter === "admin" ? PermissionsBitField.Flags.Administrator : PermissionsBitField.Flags.SendMessages;
        const filtered = shared.filter((g) => new PermissionsBitField(BigInt(g.permissionInteger)).has(requiredFlag));
        return reply.send({ data: filtered, count: filtered.length });
    });
}

export default userRoutes;
