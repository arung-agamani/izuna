import { describe, it, expect } from "vitest";
import { KeyValueRepository } from "./KeyValueRepository.js";
import { mockPrismaClient } from "../test/helpers.js";

function makeRepo() {
    const { prisma, delegate } = mockPrismaClient("keyValueStore", ["findUnique", "upsert", "delete"]);
    return { repo: new KeyValueRepository(prisma), delegate };
}

describe("KeyValueRepository", () => {
    describe("get", () => {
        it("returns the stored value when the key exists", async () => {
            const { repo, delegate } = makeRepo();
            delegate.findUnique.mockResolvedValue({ key: "a", value: { foo: 1 } });

            await expect(repo.get("a")).resolves.toEqual({ foo: 1 });
            expect(delegate.findUnique).toHaveBeenCalledWith({ where: { key: "a" } });
        });

        it("returns null when the key is missing", async () => {
            const { repo, delegate } = makeRepo();
            delegate.findUnique.mockResolvedValue(null);

            await expect(repo.get("missing")).resolves.toBeNull();
            expect(delegate.findUnique).toHaveBeenCalledWith({ where: { key: "missing" } });
        });
    });

    describe("set", () => {
        it("upserts by key, creating or updating the value", async () => {
            const { repo, delegate } = makeRepo();
            delegate.upsert.mockResolvedValue({ key: "a", value: ["x"] });

            await repo.set("a", ["x"]);

            expect(delegate.upsert).toHaveBeenCalledWith({
                where: { key: "a" },
                create: { key: "a", value: ["x"] },
                update: { value: ["x"] },
            });
        });
    });

    describe("delete", () => {
        it("deletes by key", async () => {
            const { repo, delegate } = makeRepo();
            delegate.delete.mockResolvedValue({ key: "a", value: null });

            await repo.delete("a");

            expect(delegate.delete).toHaveBeenCalledWith({ where: { key: "a" } });
        });
    });
});
