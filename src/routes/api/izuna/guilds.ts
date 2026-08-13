import type { FastifyInstance, FastifyPluginOptions } from "fastify";
import { TagService } from "../../../services/TagService";
import discordSession from "../../../lib/session";

const tagService = TagService.getInstance();

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

const ErrorResponse = { type: "object", properties: { error: { type: "string" } } };

async function guildRoutes(fastify: FastifyInstance, _opts: FastifyPluginOptions) {
    // GET /guilds/:guildId/tags
    fastify.get("/:guildId/tags", {
        onRequest: [fastify.authenticate],
        schema: {
            description: "List tags for a specific guild. Requires guild membership.",
            tags: ["tags"],
            response: {
                200: { type: "object", properties: { data: { type: "array", items: TagResponse }, count: { type: "number" } } },
                403: ErrorResponse,
            },
        },
    }, async (req, reply) => {
        const { guildId } = req.params as { guildId: string };
        const guilds = discordSession.get(req.user.uid);
        if (!guilds || !guilds.some((g) => g.guildId === guildId)) return reply.status(403).send({ error: "You are not a member of this guild" });
        const tags = await tagService.list({ type: "guild", guildId });
        return reply.send({ data: tags, count: tags.length });
    });

    // GET /guilds/:guildId/tags/:id
    fastify.get("/:guildId/tags/:id", {
        onRequest: [fastify.authenticate],
        schema: {
            description: "Get a single guild tag. Requires guild membership.",
            tags: ["tags"],
            response: { 200: { type: "object", properties: { data: TagResponse } }, 403: ErrorResponse, 404: ErrorResponse },
        },
    }, async (req, reply) => {
        const { guildId, id } = req.params as { guildId: string; id: string };
        const guilds = discordSession.get(req.user.uid);
        if (!guilds || !guilds.some((g) => g.guildId === guildId)) return reply.status(403).send({ error: "You are not a member of this guild" });
        const tag = await tagService.getById(Number(id));
        if (!tag || tag.guildId !== guildId) return reply.status(404).send({ error: "Tag not found" });
        return reply.send({ data: tag });
    });

    // DELETE /guilds/:guildId/tags/:id
    fastify.delete("/:guildId/tags/:id", {
        onRequest: [fastify.authenticate],
        schema: {
            description: "Delete a guild tag. Requires admin permission in the guild.",
            tags: ["tags"],
            response: { 204: { type: "null" }, 403: ErrorResponse, 404: ErrorResponse },
        },
    }, async (req, reply) => {
        const { guildId, id } = req.params as { guildId: string; id: string };
        const guilds = discordSession.get(req.user.uid);
        const membership = guilds?.find((g) => g.guildId === guildId);
        if (!membership) return reply.status(403).send({ error: "You are not a member of this guild" });
        if (!membership.isAdmin) return reply.status(403).send({ error: "Admin permission required to delete guild tags" });
        const tag = await tagService.getById(Number(id));
        if (!tag || tag.guildId !== guildId) return reply.status(404).send({ error: "Tag not found" });
        await tagService.deleteById(Number(id));
        return reply.status(204).send();
    });
}

export default guildRoutes;
