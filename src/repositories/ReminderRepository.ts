import type { PrismaClient, Reminder } from "@prisma/client";

export type CreateReminderData = Pick<Reminder, "uid" | "message" | "cronString" | "channelType" | "channelId"> & { guildId?: string };
export type UpdateReminderData = Partial<CreateReminderData>;

/**
 * Data-access layer for the Reminder model.
 */
export class ReminderRepository {
    constructor(private readonly prisma: PrismaClient) {}

    async findAll(): Promise<Reminder[]> {
        return this.prisma.reminder.findMany();
    }

    async findByUid(uid: string): Promise<Reminder[]> {
        return this.prisma.reminder.findMany({ where: { uid } });
    }

    async findById(id: number): Promise<Reminder | null> {
        return this.prisma.reminder.findUnique({ where: { id } });
    }

    async findByIdAndUid(id: number, uid: string): Promise<Reminder | null> {
        return this.prisma.reminder.findFirst({ where: { id, uid } });
    }

    async create(data: CreateReminderData): Promise<Reminder> {
        return this.prisma.reminder.create({
            data: { ...data, guildId: data.guildId ?? "" },
        });
    }

    async update(id: number, data: UpdateReminderData): Promise<Reminder> {
        return this.prisma.reminder.update({ where: { id }, data });
    }

    async delete(id: number): Promise<void> {
        await this.prisma.reminder.delete({ where: { id } });
    }

    async getStats(uid: string): Promise<{ total: number }> {
        const total = await this.prisma.reminder.count({ where: { uid } });
        return { total };
    }
}
