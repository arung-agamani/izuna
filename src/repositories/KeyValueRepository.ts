import type { PrismaClient, Prisma } from "../generated/prisma/client.js";

/**
 * Generic key/value store backed by the `KeyValueStore` Postgres table.
 * Values are JSONB — any JSON-serializable payload works, no schema changes needed.
 */
export class KeyValueRepository {
    constructor(private readonly prisma: PrismaClient) {}

    async get(key: string): Promise<unknown | null> {
        const row = await this.prisma.keyValueStore.findUnique({ where: { key } });
        return row?.value ?? null;
    }

    async set(key: string, value: Prisma.InputJsonValue): Promise<void> {
        await this.prisma.keyValueStore.upsert({
            where: { key },
            create: { key, value },
            update: { value },
        });
    }

    async delete(key: string): Promise<void> {
        await this.prisma.keyValueStore.delete({ where: { key } });
    }
}
