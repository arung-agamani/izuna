import type { PrismaClient } from "../generated/prisma/client.js";
import { vi, type Mock } from "vitest";

/**
 * Build a PrismaClient stub where `client[model][method]` is a fresh vi.fn() for each requested method.
 * Returns the stub plus the delegate record so tests can assert exact call arguments.
 *
 * Usage:
 *   const { prisma, delegate: tag } = mockPrismaClient("tag", ["findUnique", "create"]);
 *   tag.findUnique.mockResolvedValue(makeTag());
 *   expect(tag.findUnique).toHaveBeenCalledWith({ where: { id: 1 } });
 */
export function mockPrismaClient(model: string, methods: readonly string[]): { prisma: PrismaClient; delegate: Record<string, Mock> } {
    const delegate = Object.fromEntries(methods.map((m) => [m, vi.fn()])) as Record<string, Mock>;
    const prisma = { [model]: delegate } as unknown as PrismaClient;
    return { prisma, delegate };
}
