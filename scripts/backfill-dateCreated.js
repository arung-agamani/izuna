const { PrismaClient } = require("@prisma/client");

/**
 * Backfill script — copies legacy `dateCreated` values into the new `createdAt` column.
 *
 * Stage 2 of the timestamp migration:
 *   1. Schema keeps `dateCreated` alongside the new `createdAt` (non-destructive).
 *   2. This script copies `dateCreated` -> `createdAt` for existing rows.
 *   3. `dateCreated` is dropped in a later migration.
 *
 * Idempotent: safe to run multiple times.
 * Self-contained: creates its own Prisma client so it runs in the production
 * container (which lacks `tsx` and TypeScript sources).
 *
 * Run with: node scripts/backfill-dateCreated.js
 */
async function main() {
    const prisma = new PrismaClient();
    const tables = ["User", "Playlist", "Tag"];

    try {
        for (const table of tables) {
            const rowsUpdated = await prisma.$executeRawUnsafe(
                `UPDATE "${table}" SET "createdAt" = "dateCreated" WHERE "createdAt" IS DISTINCT FROM "dateCreated"`,
            );
            console.log(`Backfilled ${table}.createdAt from dateCreated: ${rowsUpdated} rows updated`);
        }
        console.log("Backfill complete");
    } finally {
        await prisma.$disconnect();
    }
}

main().catch((err) => {
    console.error("Backfill failed:", err);
    process.exit(1);
});
