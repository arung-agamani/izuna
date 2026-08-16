import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
    schema: "prisma/schema.prisma",
    migrations: {
        path: "prisma/migrations",
    },
    datasource: {
        // Fall back to "" so `prisma generate` works without a DB (CI), while
        // `migrate`/`db push` still fail loudly on a missing URL.
        url: process.env.DATABASE_URL ?? "",
    },
});
