import type { FastifyInstance, FastifyPluginOptions } from "fastify";
import { TagService } from "../../../services/TagService";
import discordSession from "../../../lib/session";

const tagService = TagService.getInstance();

async function guildRoutes(fastify: FastifyInstance, _opts: FastifyPluginOptions) {
    // GET /guilds/:guildId/tags — list guild tags (must be member)
    fastify.get("/:guildId/tags", { onRequest: [fastify.authenticate] }, async (req, reply) => {
        const { guildId } = req.params as { guildId: string };

        const guilds = discordSession.get(req.user.uid);
        if (!guilds || !guilds.some((g) => g.guildId === guildId)) {
            return reply.status(403).send({ error: "You are not a member of this guild" });
        }

        const tags = await tagService.list({ type: "guild", guildId });
        return reply.send({ data: tags, count: tags.length });
    });

    // GET /guilds/:guildId/tags/:id — get single guild tag
    fastify.get("/:guildId/tags/:id", { onRequest: [fastify.authenticate] }, async (req, reply) => {
        const { guildId, id } = req.params as { guildId: string; id: string };

        const guilds = discordSession.get(req.user.uid);
        if (!guilds || !guilds.some((g) => g.guildId === guildId)) {
            return reply.status(403).send({ error: "You are not a member of this guild" });
        }

        const tag = await tagService.getById(Number(id));
        if (!tag || tag.guildId !== guildId) {
            return reply.status(404).send({ error: "Tag not found" });
        }

        return reply.send({ data: tag });
    });

    // DELETE /guilds/:guildId/tags/:id — delete guild tag (admin only)
    fastify.delete("/:guildId/tags/:id", { onRequest: [fastify.authenticate] }, async (req, reply) => {
        const { guildId, id } = req.params as { guildId: string; id: string };

        const guilds = discordSession.get(req.user.uid);
        const membership = guilds?.find((g) => g.guildId === guildId);
        if (!membership) {
            return reply.status(403).send({ error: "You are not a member of this guild" });
        }
        if (!membership.isAdmin) {
            return reply.status(403).send({ error: "Admin permission required to delete guild tags" });
        }

        const tag = await tagService.getById(Number(id));
        if (!tag || tag.guildId !== guildId) {
            return reply.status(404).send({ error: "Tag not found" });
        }

        await tagService.deleteById(Number(id));
        return reply.status(204).send();
    });
}

export default guildRoutes;
