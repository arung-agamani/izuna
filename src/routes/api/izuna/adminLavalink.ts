import type { FastifyInstance, FastifyPluginOptions } from "fastify";
import { UpdatePreferencesSchema, type LavalinkAdminService } from "../../../services/LavalinkAdminService.js";

interface AdminLavalinkRoutesOptions extends FastifyPluginOptions {
    lavalinkAdminService: LavalinkAdminService;
}

const NodeStatusResponse = {
    type: "object",
    properties: {
        name: { type: "string" },
        group: { type: ["string", "null"] },
        state: { type: "string" },
        connected: { type: "boolean" },
        penalties: { type: "number" },
        tags: { type: "array", items: { type: "string" } },
        lastError: { type: ["string", "null"] },
    },
};

const TagsMapResponse = {
    type: "object",
    additionalProperties: { type: "array", items: { type: "string" } },
};

const PreferencesResponse = {
    type: "object",
    properties: {
        sourceTags: TagsMapResponse,
        nodeTags: TagsMapResponse,
    },
};

const ErrorResponse = { type: "object", properties: { error: { type: "string" } } };
const DataResponse = (item: Record<string, unknown>) => ({ type: "object", properties: { data: item } });
const DataArrayResponse = (item: Record<string, unknown>) => ({ type: "object", properties: { data: { type: "array", items: item }, count: { type: "number" } } });

async function adminLavalinkRoutes(fastify: FastifyInstance, opts: AdminLavalinkRoutesOptions) {
    const { lavalinkAdminService } = opts;

    fastify.get("/nodes", {
        onRequest: [fastify.adminRequired],
        schema: {
            description: "Current Lavalink node pool status (name, group, connection, penalties, effective tags).",
            tags: ["admin", "lavalink"],
            response: { 200: DataArrayResponse(NodeStatusResponse) },
        },
    }, async (_req, reply) => {
        const data = lavalinkAdminService.getNodes();
        return reply.send({ data, count: data.length });
    });

    fastify.get("/preferences", {
        onRequest: [fastify.adminRequired],
        schema: {
            description: "Current source→tag and node→tags preferences.",
            tags: ["admin", "lavalink"],
            response: { 200: DataResponse(PreferencesResponse) },
        },
    }, async (_req, reply) => {
        return reply.send({ data: await lavalinkAdminService.getPreferences() });
    });

    fastify.put("/preferences", {
        onRequest: [fastify.adminRequired],
        schema: {
            description: "Replace source→tag and/or node→tags preferences (fields are partial).",
            tags: ["admin", "lavalink"],
            response: { 200: DataResponse(PreferencesResponse), 400: ErrorResponse },
        },
    }, async (req, reply) => {
        const parsed = UpdatePreferencesSchema.safeParse(req.body);
        if (!parsed.success) {
            return reply.status(400).send({ error: "Invalid preferences payload" });
        }
        const data = await lavalinkAdminService.updatePreferences(parsed.data);
        return reply.send({ data });
    });

    fastify.post("/sync", {
        onRequest: [fastify.adminRequired],
        schema: {
            description: "Re-fetch the public node pool and reload preferences.",
            tags: ["admin", "lavalink"],
            response: { 200: DataResponse({ type: "object", properties: { synced: { type: "boolean" } } }) },
        },
    }, async (_req, reply) => {
        await lavalinkAdminService.syncNodes();
        return reply.send({ data: { synced: true } });
    });
}

export default adminLavalinkRoutes;
