import { describe, it, expect } from "vitest";
import { PlayerSessionRepository } from "./PlayerSessionRepository";
import { mockPrismaClient } from "../test/helpers";

describe("PlayerSessionRepository", () => {
    it("deleteByGuild scopes the deleteMany to the guild", async () => {
        const { prisma, delegate: playerSession } = mockPrismaClient("playerSession", ["deleteMany"]);
        playerSession.deleteMany.mockResolvedValue({ count: 1 });
        const repo = new PlayerSessionRepository(prisma);

        await repo.deleteByGuild("456");

        expect(playerSession.deleteMany).toHaveBeenCalledWith({ where: { guildId: "456" } });
    });
});
