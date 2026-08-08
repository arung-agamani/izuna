import type { SapphireClient } from "@sapphire/framework";
import { CronJob } from "cron";
import type { TextChannel } from "discord.js";
import logger, { logError, getErrorMessage } from "../lib/winston";
import type { Reminder } from "@prisma/client";
import { ReminderRepository } from "../repositories/ReminderRepository";
import prisma from "../lib/prisma";

/**
 * Data structure for creating a new reminder
 */
export interface CreateReminderData {
    uid: string;
    message: string;
    cronString: string;
    channelType: "DM" | "CHANNEL";
    guildId?: string;
    channelId: string;
}

/**
 * Data structure for updating an existing reminder
 */
export interface UpdateReminderData {
    message?: string;
    cronString?: string;
    channelType?: "DM" | "CHANNEL";
    guildId?: string;
    channelId?: string;
}

/**
 * Query options for listing reminders
 */
export interface ListRemindersOptions {
    userId?: string;
    guildId?: string;
    channelId?: string;
}

/**
 * ReminderService - Singleton service for managing reminders
 *
 * This service handles:
 * - CRUD operations for reminders in the database
 * - Cron job lifecycle management (start, stop, restart)
 * - Message sending to Discord channels/DMs
 */
export class ReminderService {
    private static instance: ReminderService | null = null;
    private readonly repo: ReminderRepository;
    private reminderJobs: Map<number, CronJob> = new Map();
    private client: SapphireClient | null = null;
    private initialized: boolean = false;

    private readonly CRON_REGEX =
        /(@(annually|yearly|monthly|weekly|daily|hourly|reboot))|(@every (\d+(ns|us|µs|ms|s|m|h))+)|((((\d+,)+\d+|(\d+(\/|-)\d+)|\d+|\*) ?){5,7})/;

    private constructor(repository?: ReminderRepository) {
        this.repo = repository ?? new ReminderRepository(prisma);
    }

    public static getInstance(): ReminderService {
        if (!ReminderService.instance) {
            ReminderService.instance = new ReminderService();
        }
        return ReminderService.instance;
    }

    public async initialize(client: SapphireClient): Promise<void> {
        if (this.initialized) {
            logger.warn("ReminderService already initialized, skipping...");
            return;
        }

        this.client = client;
        logger.info("Initializing ReminderService...");

        try {
            const reminders = await this.repo.findAll();
            logger.info(`Loading ${reminders.length} reminders from database`);

            for (const reminder of reminders) {
                try {
                    this.startReminderJob(reminder);
                } catch (error) {
                    logError(`Failed to start reminder job ${reminder.id}:`, error);
                }
            }

            this.initialized = true;
            logger.info(`ReminderService initialized with ${this.reminderJobs.size} active jobs`);
        } catch (error) {
            logError("Failed to initialize ReminderService:", error);
            throw error;
        }
    }

    public validateCronString(cronString: string): boolean {
        return this.CRON_REGEX.test(cronString);
    }

    public async createReminder(data: CreateReminderData): Promise<Reminder> {
        if (!this.client) {
            throw new Error("ReminderService not initialized. Call initialize() first.");
        }

        if (!this.validateCronString(data.cronString)) {
            throw new Error(`Invalid cron string: ${data.cronString}`);
        }

        logger.info(`Creating reminder for user ${data.uid}`);

        const reminder = await this.repo.create(data);

        this.startReminderJob(reminder);

        logger.info(`Created reminder ${reminder.id} with cron: ${reminder.cronString}`);
        return reminder;
    }

    public async updateReminder(id: number, data: UpdateReminderData): Promise<Reminder> {
        if (!this.client) {
            throw new Error("ReminderService not initialized. Call initialize() first.");
        }

        if (data.cronString && !this.validateCronString(data.cronString)) {
            throw new Error(`Invalid cron string: ${data.cronString}`);
        }

        logger.info(`Updating reminder ${id}`);

        const existing = await this.repo.findById(id);
        if (!existing) {
            throw new Error(`Reminder ${id} not found`);
        }

        const reminder = await this.repo.update(id, data);
        this.restartReminderJob(reminder);

        logger.info(`Updated reminder ${id}`);
        return reminder;
    }

    public async deleteReminder(id: number): Promise<Reminder> {
        logger.info(`Deleting reminder ${id}`);

        const reminder = await this.repo.findById(id);
        if (!reminder) {
            throw new Error(`Reminder ${id} not found`);
        }

        await this.repo.delete(id);
        this.stopReminderJob(id);

        logger.info(`Deleted reminder ${id}`);
        return reminder;
    }

    public async getReminder(id: number): Promise<Reminder | null> {
        return this.repo.findById(id);
    }

    public async getReminderForUser(id: number, userId: string): Promise<Reminder | null> {
        return this.repo.findByIdAndUid(id, userId);
    }

    public async listReminders(options: ListRemindersOptions = {}): Promise<Reminder[]> {
        // Dynamic query — keep inline Prisma for now until repository has a generic query builder
        const where: Record<string, string> = {};
        if (options.userId) where.uid = options.userId;
        if (options.guildId) where.guildId = options.guildId;
        if (options.channelId) where.channelId = options.channelId;

        return prisma.reminder.findMany({ where, orderBy: { id: "asc" } });
    }

    private startReminderJob(reminder: Reminder): void {
        if (!this.client) {
            logger.error("Cannot start reminder job: client not initialized");
            return;
        }

        this.stopReminderJob(reminder.id);

        try {
            const job = new CronJob(
                reminder.cronString,
                () => this.executeReminder(reminder),
                null,
                true,
            );

            this.reminderJobs.set(reminder.id, job);
        } catch (error) {
            logError(`Failed to create cron job for reminder ${reminder.id}:`, error);
            throw error;
        }
    }

    private stopReminderJob(id: number): void {
        const job = this.reminderJobs.get(id);
        if (job) {
            job.stop();
            this.reminderJobs.delete(id);
        }
    }

    private restartReminderJob(reminder: Reminder): void {
        this.stopReminderJob(reminder.id);
        this.startReminderJob(reminder);
    }

    private async executeReminder(reminder: Reminder): Promise<void> {
        try {
            if (!this.client) return;

            if (reminder.channelType === "DM") {
                const user = await this.client.users.fetch(reminder.uid);
                await user.send(reminder.message);
            } else {
                const guild = await this.client.guilds.fetch(reminder.guildId);
                const channel = (await guild.channels.fetch(reminder.channelId)) as TextChannel;
                if (channel?.isSendable()) {
                    await channel.send(reminder.message);
                }
            }
        } catch (error) {
            logError(`Error executing reminder ${reminder.id}:`, error);
        }
    }
}

export default ReminderService;
