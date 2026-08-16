import { describe, it, expect } from "vitest";
import type { Reminder } from "../generated/prisma/client.js";
import { ReminderRepository, type CreateReminderData } from "./ReminderRepository.js";
import { mockPrismaClient } from "../test/helpers.js";

function makeReminder(overrides: Partial<Reminder> = {}): Reminder {
    return {
        id: overrides.id ?? 1,
        uid: overrides.uid ?? "123",
        message: overrides.message ?? "water the plants",
        cronString: overrides.cronString ?? "0 9 * * *",
        guildId: overrides.guildId ?? null,
        channelId: overrides.channelId ?? "",
        channelType: overrides.channelType ?? "DM",
        createdAt: overrides.createdAt ?? new Date(),
        updatedAt: overrides.updatedAt ?? new Date(),
    };
}

function makeRepo() {
    const { prisma, delegate: reminder } = mockPrismaClient("reminder", ["findMany", "findUnique", "findFirst", "create", "update", "delete", "count"]);
    return { repo: new ReminderRepository(prisma), reminder };
}

describe("ReminderRepository", () => {
    describe("reads", () => {
        it("findAll returns every reminder", async () => {
            const { repo, reminder } = makeRepo();
            reminder.findMany.mockResolvedValue([makeReminder()]);

            const result = await repo.findAll();

            expect(result).toHaveLength(1);
            expect(reminder.findMany).toHaveBeenCalledWith();
        });

        it("findByUid scopes to the user", async () => {
            const { repo, reminder } = makeRepo();
            reminder.findMany.mockResolvedValue([]);

            await repo.findByUid("123");

            expect(reminder.findMany).toHaveBeenCalledWith({ where: { uid: "123" } });
        });

        it("findById queries by primary key", async () => {
            const { repo, reminder } = makeRepo();
            reminder.findUnique.mockResolvedValue(null);

            const result = await repo.findById(4);

            expect(result).toBeNull();
            expect(reminder.findUnique).toHaveBeenCalledWith({ where: { id: 4 } });
        });

        it("findByIdAndUid requires both id and owner", async () => {
            const { repo, reminder } = makeRepo();
            reminder.findFirst.mockResolvedValue(null);

            await repo.findByIdAndUid(4, "123");

            expect(reminder.findFirst).toHaveBeenCalledWith({ where: { id: 4, uid: "123" } });
        });
    });

    describe("create", () => {
        it("defaults guildId to null when omitted (DM reminders)", async () => {
            const { repo, reminder } = makeRepo();
            reminder.create.mockResolvedValue(makeReminder());
            const data: CreateReminderData = { uid: "123", message: "m", cronString: "0 9 * * *", channelType: "DM", channelId: "" };

            await repo.create(data);

            expect(reminder.create).toHaveBeenCalledWith({ data: { ...data, guildId: null } });
        });

        it("preserves guildId when provided (channel reminders)", async () => {
            const { repo, reminder } = makeRepo();
            reminder.create.mockResolvedValue(makeReminder({ guildId: "456" }));
            const data: CreateReminderData = { uid: "123", message: "m", cronString: "0 9 * * *", channelType: "CHANNEL", channelId: "c1", guildId: "456" };

            await repo.create(data);

            expect(reminder.create).toHaveBeenCalledWith({ data });
        });
    });

    describe("update / delete", () => {
        it("update patches by id", async () => {
            const { repo, reminder } = makeRepo();
            reminder.update.mockResolvedValue(makeReminder());

            await repo.update(2, { message: "new" });

            expect(reminder.update).toHaveBeenCalledWith({ where: { id: 2 }, data: { message: "new" } });
        });

        it("delete removes by id", async () => {
            const { repo, reminder } = makeRepo();
            reminder.delete.mockResolvedValue(makeReminder());

            await repo.delete(2);

            expect(reminder.delete).toHaveBeenCalledWith({ where: { id: 2 } });
        });
    });

    describe("getStats", () => {
        it("counts reminders for the user", async () => {
            const { repo, reminder } = makeRepo();
            reminder.count.mockResolvedValue(3);

            const result = await repo.getStats("123");

            expect(result).toEqual({ total: 3 });
            expect(reminder.count).toHaveBeenCalledWith({ where: { uid: "123" } });
        });
    });
});
