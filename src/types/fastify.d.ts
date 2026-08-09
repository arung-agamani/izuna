// Type augmentations for Fastify plugins used across routes.
// This file is included in both the main tsconfig and test tsconfig.
import type { FastifyRequest, FastifyReply } from "fastify";

declare module "fastify" {
    interface FastifyInstance {
        authenticate: (req: FastifyRequest, res: FastifyReply) => Promise<void>;
    }
}

declare module "@fastify/jwt" {
    interface FastifyJWT {
        user: {
            id: number;
            uid: string;
        };
    }
}
