import type { FastifyInstance, FastifyPluginOptions } from "fastify";
import type { Guild } from "discord.js";
import { getBotClient } from "../../../lib/botClient";

const GuildResponse = {
    type: "object",
    properties: {
        id: { type: "string" },
        name: { type: "string" },
        icon: { type: "string" },
        description: { type: "string" },
        memberCount: { type: "number" },
        presenceCount: { type: "number" },
        ownerId: { type: "string" },
        joinedAt: { type: "string" },
        preferredLocale: { type: "string" },
        verificationLevel: { type: "string" },
        explicitContentFilter: { type: "string" },
        nsfwLevel: { type: "string" },
        permissions: { type: "number", description: "Bitfield of bot's guild-level permissions" },
        permissionsList: { type: "array", items: { type: "string" } },
    },
};

const BotResponse = {
    type: "object",
    properties: {
        id: { type: "string" },
        username: { type: "string" },
        discriminator: { type: "string" },
        avatarUrl: { type: "string" },
        guildCount: { type: "number" },
        userCount: { type: "number", description: "Estimated unique users across all guilds" },
        uptimeMs: { type: "number" },
        uptimeHuman: { type: "string" },
        pingMs: { type: "number" },
        startedAt: { type: "string" },
    },
};

const ErrorResponse = { type: "object", properties: { error: { type: "string" } } };
const DataResponse = (item: Record<string, unknown>) => ({ type: "object", properties: { data: item } });
const DataArrayResponse = (item: Record<string, unknown>) => ({ type: "object", properties: { data: { type: "array", items: item }, count: { type: "number" } } });

function formatUptime(uptimeMs: number): string {
    const d = Math.floor(uptimeMs / 86400000);
    const h = Math.floor((uptimeMs % 86400000) / 3600000);
    const m = Math.floor((uptimeMs % 3600000) / 60000);
    const parts: string[] = [];
    if (d > 0) parts.push(`${d}d`);
    if (h > 0) parts.push(`${h}h`);
    if (m > 0) parts.push(`${m}m`);
    return parts.join(" ") || "<1m";
}

const VERIFICATION_NAMES: Record<number, string> = {
    0: "None", 1: "Low", 2: "Medium", 3: "High", 4: "Very High",
};
const EXPLICIT_FILTER_NAMES: Record<number, string> = {
    0: "Disabled", 1: "Members without roles", 2: "All members",
};
const NSFW_NAMES: Record<number, string> = {
    0: "Default", 1: "Explicit", 2: "Safe", 3: "Age Restricted",
};

function buildGuildPayload(guild: Guild) {
    const bitfield = guild.members?.me?.permissions?.bitfield ?? BigInt(0);
    return {
        id: guild.id,
        name: guild.name,
        icon: guild.iconURL({ size: 128 }) ?? "",
        description: guild.description ?? "",
        memberCount: guild.memberCount,
        presenceCount: guild.approximatePresenceCount ?? 0,
        ownerId: guild.ownerId,
        joinedAt: guild.joinedAt?.toISOString() ?? "",
        preferredLocale: guild.preferredLocale,
        verificationLevel: VERIFICATION_NAMES[guild.verificationLevel] ?? "Unknown",
        explicitContentFilter: EXPLICIT_FILTER_NAMES[guild.explicitContentFilter] ?? "Unknown",
        nsfwLevel: NSFW_NAMES[guild.nsfwLevel] ?? "Unknown",
        permissions: Number(bitfield),
        permissionsList: resolvePermissions(bitfield),
    };
}

const WELL_KNOWN_PERMISSIONS: [bigint, string][] = [
    [BigInt(1) << BigInt(3), "Administrator"],
    [BigInt(1) << BigInt(5), "Manage Server"],
    [BigInt(1) << BigInt(20), "Manage Channels"],
    [BigInt(1) << BigInt(22), "Manage Webhooks"],
    [BigInt(1) << BigInt(13), "Manage Roles"],
    [BigInt(1) << BigInt(28), "Manage Events"],
    [BigInt(1) << BigInt(16), "Manage Threads"],
    [BigInt(1) << BigInt(2), "Kick Members"],
    [BigInt(1) << BigInt(1), "Ban Members"],
    [BigInt(1) << BigInt(27), "Moderate Members"],
    [BigInt(1) << BigInt(10), "Read Messages"],
    [BigInt(1) << BigInt(11), "Send Messages"],
    [BigInt(1) << BigInt(12), "Manage Messages"],
    [BigInt(1) << BigInt(14), "Embed Links"],
    [BigInt(1) << BigInt(15), "Attach Files"],
    [BigInt(1) << BigInt(17), "Read Message History"],
    [BigInt(1) << BigInt(18), "Mention Everyone"],
    [BigInt(1) << BigInt(19), "Use External Emojis"],
    [BigInt(1) << BigInt(25), "Connect"],
    [BigInt(1) << BigInt(24), "Speak"],
    [BigInt(1) << BigInt(23), "Mute Members"],
    [BigInt(1) << BigInt(21), "Deafen Members"],
    [BigInt(1) << BigInt(26), "Move Members"],
    [BigInt(1) << BigInt(6), "Manage Nicknames"],
    [BigInt(1) << BigInt(4), "View Audit Log"],
    [BigInt(1) << BigInt(7), "Change Nickname"],
    [BigInt(1) << BigInt(32), "Use Application Commands"],
    [BigInt(1) << BigInt(33), "Request to Speak"],
    [BigInt(1) << BigInt(38), "Create Events"],
];

function resolvePermissions(bitfield: bigint): string[] {
    return WELL_KNOWN_PERMISSIONS.filter(([flag]) => (bitfield & flag) !== BigInt(0)).map(([, name]) => name);
}

async function adminRoutes(fastify: FastifyInstance, _opts: FastifyPluginOptions) {
    // ═══════════════════════════════════════════
    // GET /bot — bot profile + stats
    // ═══════════════════════════════════════════
    fastify.get("/bot", {
        onRequest: [fastify.adminRequired],
        schema: { description: "Bot profile and runtime stats.", tags: ["admin"], response: { 200: DataResponse(BotResponse), 503: ErrorResponse } },
    }, async (_req, reply) => {
        const client = getBotClient();
        if (!client?.user) {
            return reply.status(503).send({ error: "Bot client not ready" });
        }

        const user = client.user;
        const guilds = client.guilds.cache;
        const memberCount = guilds.reduce((sum, g) => sum + g.memberCount, 0);

        return reply.send({
            data: {
                id: user.id,
                username: user.username,
                discriminator: user.discriminator,
                avatarUrl: user.displayAvatarURL({ size: 256 }),
                guildCount: guilds.size,
                userCount: memberCount,
                uptimeMs: client.uptime ?? 0,
                uptimeHuman: formatUptime(client.uptime ?? 0),
                pingMs: client.ws.ping,
                startedAt: client.readyAt?.toISOString() ?? "",
            },
        });
    });

    // ═══════════════════════════════════════════
    // GET /guilds — all guilds with permissions
    // ═══════════════════════════════════════════
    fastify.get("/guilds", {
        onRequest: [fastify.adminRequired],
        schema: { description: "List all guilds the bot is in, with permissions.", tags: ["admin"], response: { 200: DataArrayResponse(GuildResponse) } },
    }, async (_req, reply) => {
        const client = getBotClient();
        if (!client) return reply.status(503).send({ error: "Bot client not ready" });

        const guilds = await Promise.all(
            client.guilds.cache.map(async (guild) => buildGuildPayload(guild)),
        );

        guilds.sort((a, b) => a.name.localeCompare(b.name));
        return reply.send({ data: guilds, count: guilds.length });
    });

    // ═══════════════════════════════════════════
    // GET /guilds/:id — single guild detail
    // ═══════════════════════════════════════════
    fastify.get("/guilds/:id", {
        onRequest: [fastify.adminRequired],
        schema: { description: "Get a single guild's detail.", tags: ["admin"], response: { 200: DataResponse(GuildResponse), 404: ErrorResponse } },
    }, async (req, reply) => {
        const client = getBotClient();
        if (!client) return reply.status(503).send({ error: "Bot client not ready" });

        const { id } = req.params as { id: string };
        const guild = client.guilds.cache.get(id);
        if (!guild) return reply.status(404).send({ error: "Guild not found" });

        return reply.send({
            data: buildGuildPayload(guild),
        });
    });
}

export default adminRoutes;
