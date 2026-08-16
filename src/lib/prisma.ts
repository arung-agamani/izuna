import { PrismaClient } from "../generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
    // `pg` defaults to no connection timeout (0); Prisma v6 used 5s. Keep the old behavior.
    connectionTimeoutMillis: 5000,
});

const prisma = new PrismaClient({ adapter });

export default prisma;
