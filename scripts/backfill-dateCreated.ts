import prisma from "../src/lib/prisma";
import logger, { logError } from "../src/lib/winston";

/**
 * Backfill script — copies legacy `dateCreated` values into the new `createdAt` column.
 *
 * Stage 2 of the timestamp migration:
 *   1. Schema keeps `dateCreated` alongside the new `createdAt` (non-destructive).
 *   2. This script copies `dateCreated` → `createdAt` for existing rows.
 *   3. `dateCreated` is dropped in a later migration.
 *
 * Idempotent: safe to run multiple times.
 * Run with: npx tsx scripts/backfill-dateCreated.ts
 */
async function main() {
    const tables = ["User", "Playlist", "Tag"] as const;

    for (const table of tables) {
        // Table names are hardcoded constants, not user input — safe for raw execution.
        const rowsUpdated = await prisma.$executeRawUnsafe(
            `UPDATE "${table}" SET "createdAt" = "dateCreated" WHERE "createdAt" IS DISTINCT FROM "dateCreated"`,
        );
        logger.info(`Backfilled ${table}.createdAt from dateCreated`, { table, rowsUpdated });
    }
}

main()
    .then(() => logger.info("Backfill complete"))
    .catch((err) => {
        logError("Backfill failed", err);
        process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
