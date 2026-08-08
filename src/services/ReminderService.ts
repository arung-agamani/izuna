import type { SapphireClient } from "@sapphire/framework";
import { CronJob } from "cron";
import type { TextChannel } from "discord.js";
import logger, { logError, getErrorMessage } from "../lib/winston"
import prisma from "../lib/prisma";
import type { Reminder } from "@prisma/client";

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
 *
 * @example
 * const reminderService = ReminderService.getInstance();
 * await reminderService.initialize(client);
 * const reminder = await reminderService.createReminder({
 *   uid: "123456789",
 *   message: "Don't forget!",
 *   cronString: "0 9 * * *",
 *   channelType: "DM",
 *   channelId: "123456789"
 * });
 */
export class ReminderService {
    private static instance: ReminderService | null = null;
    private reminderJobs: Map<number, CronJob> = new Map();
    private client: SapphireClient | null = null;
    private initialized: boolean = false;

    /**
     * Regex pattern for validating cron strings
     * Supports:
     * - Standard cron format (5-7 fields)
     * - Special strings (@annually, @yearly, @monthly, @weekly, @daily, @hourly, @reboot)
     * - @every syntax with duration
     */
    private readonly CRON_REGEX = /(@(annually|yearly|monthly|weekly|daily|hourly|reboot))|(@every (\d+(ns|us|µs|ms|s|m|h))+)|((((\d+,)+\d+|(\d+(\/|-)\d+)|\d+|\*) ?){5,7})/;

    private constructor() {
        // Private constructor to enforce singleton
    }

    /**
     * Get the singleton instance of ReminderService
     */
    public static getInstance(): ReminderService {
        if (!ReminderService.instance) {
            ReminderService.instance = new ReminderService();
        }
        return ReminderService.instance;
    }

    /**
     * Initialize the reminder service
     * Loads all reminders from database and starts their cron jobs
     *
     * @param client - Discord client instance for sending messages
     */
    public async initialize(client: SapphireClient): Promise<void> {
        if (this.initialized) {
            logger.warn("ReminderService already initialized, skipping...");
            return;
        }

        this.client = client;
        logger.info("Initializing ReminderService...");

        try {
            const reminders = await prisma.reminder.findMany();
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

    /**
     * Validate a cron string
     *
     * @param cronString - The cron string to validate
     * @returns True if valid, false otherwise
     */
    public validateCronString(cronString: string): boolean {
        return this.CRON_REGEX.test(cronString);
    }

    /**
     * Create a new reminder
     *
     * @param data - Reminder creation data
     * @returns The created reminder
     * @throws Error if cron string is invalid or client is not initialized
     */
    public async createReminder(data: CreateReminderData): Promise<Reminder> {
        if (!this.client) {
            throw new Error("ReminderService not initialized. Call initialize() first.");
        }

        if (!this.validateCronString(data.cronString)) {
            throw new Error(`Invalid cron string: ${data.cronString}`);
        }

        logger.info(`Creating reminder for user ${data.uid}`);

        const reminder = await prisma.reminder.create({
            data: {
                uid: data.uid,
                message: data.message,
                cronString: data.cronString,
                channelType: data.channelType,
                guildId: data.guildId || "",
                channelId: data.channelId,
            },
        });

        // Start the cron job for the new reminder
        this.startReminderJob(reminder);

        logger.info(`Created reminder ${reminder.id} with cron: ${reminder.cronString}`);
        return reminder;
    }

    /**
     * Update an existing reminder
     *
     * @param id - Reminder ID
     * @param data - Update data
     * @returns The updated reminder
     * @throws Error if reminder not found or cron string is invalid
     */
    public async updateReminder(id: number, data: UpdateReminderData): Promise<Reminder> {
        if (!this.client) {
            throw new Error("ReminderService not initialized. Call initialize() first.");
        }

        if (data.cronString && !this.validateCronString(data.cronString)) {
            throw new Error(`Invalid cron string: ${data.cronString}`);
        }

        logger.info(`Updating reminder ${id}`);

        // Check if reminder exists
        const existing = await prisma.reminder.findUnique({ where: { id } });
        if (!existing) {
            throw new Error(`Reminder ${id} not found`);
        }

        // Update in database
        const reminder = await prisma.reminder.update({
            where: { id },
            data: {
                message: data.message,
                cronString: data.cronString,
                channelType: data.channelType,
                guildId: data.guildId,
                channelId: data.channelId,
            },
        });

        // Restart the cron job with new settings
        this.restartReminderJob(reminder);

        logger.info(`Updated reminder ${id}`);
        return reminder;
    }

    /**
     * Delete a reminder
     *
     * @param id - Reminder ID
     * @returns The deleted reminder
     * @throws Error if reminder not found
     */
    public async deleteReminder(id: number): Promise<Reminder> {
        logger.info(`Deleting reminder ${id}`);

        const reminder = await prisma.reminder.delete({
            where: { id },
        });

        // Stop the cron job
        this.stopReminderJob(id);

        logger.info(`Deleted reminder ${id}`);
        return reminder;
    }

    /**
     * Get a single reminder by ID
     *
     * @param id - Reminder ID
     * @returns The reminder or null if not found
     */
    public async getReminder(id: number): Promise<Reminder | null> {
        return await prisma.reminder.findUnique({
            where: { id },
        });
    }

    /**
     * Get a reminder by ID for a specific user
     *
     * @param id - Reminder ID
     * @param userId - User ID to verify ownership
     * @returns The reminder or null if not found or not owned by user
     */
    public async getReminderForUser(id: number, userId: string): Promise<Reminder | null> {
        return await prisma.reminder.findFirst({
            where: {
                id,
                uid: userId,
            },
        });
    }

    /**
     * List reminders based on filter options
     *
     * @param options - Filter options
     * @returns Array of reminders matching the filters
     */
    public async listReminders(options: ListRemindersOptions = {}): Promise<Reminder[]> {
        const where: any = {};

        if (options.userId) {
            where.uid = options.userId;
        }
        if (options.guildId) {
            where.guildId = options.guildId;
        }
        if (options.channelId) {
            where.channelId = options.channelId;
        }

        return await prisma.reminder.findMany({
            where,
            orderBy: {
                id: 'asc',
            },
        });
    }

    /**
     * Start a cron job for a reminder
     *
     * @param reminder - The reminder to start
     */
    private startReminderJob(reminder: Reminder): void {
        if (!this.client) {
            logger.error("Cannot start reminder job: client not initialized");
            return;
        }

        // Stop existing job if any
        this.stopReminderJob(reminder.id);

        try {
            const cronJob = new CronJob(
                reminder.cronString,
                () => this.executeReminder(reminder),
                null,
                true, // Start immediately
                "Asia/Jakarta" // Timezone
            );

            this.reminderJobs.set(reminder.id, cronJob);
            logger.debug(`Started cron job for reminder ${reminder.id}`);
        } catch (error) {
            logError(`Failed to create cron job for reminder ${reminder.id}:`, error);
            throw error;
        }
    }

    /**
     * Stop a cron job for a reminder
     *
     * @param id - Reminder ID
     */
    private stopReminderJob(id: number): void {
        const existingJob = this.reminderJobs.get(id);
        if (existingJob) {
            existingJob.stop();
            this.reminderJobs.delete(id);
            logger.debug(`Stopped cron job for reminder ${id}`);
        }
    }

    /**
     * Restart a cron job for a reminder
     *
     * @param reminder - The reminder to restart
     */
    private restartReminderJob(reminder: Reminder): void {
        this.stopReminderJob(reminder.id);
        this.startReminderJob(reminder);
    }

    /**
     * Execute a reminder (send the message)
     *
     * @param reminder - The reminder to execute
     */
    private async executeReminder(reminder: Reminder): Promise<void> {
        if (!this.client) {
            logger.error("Cannot execute reminder: client not initialized");
            return;
        }

        try {
            if (reminder.channelType === "DM") {
                const user = await this.client.users.fetch(reminder.uid);
                if (user) {
                    await user.send(reminder.message);
                    logger.debug(`Sent DM reminder ${reminder.id} to user ${reminder.uid}`);
                } else {
                    logger.warn(`Failed to send reminder ${reminder.id}: User ${reminder.uid} not found`);
                }
            } else if (reminder.channelType === "CHANNEL") {
                const guild = this.client.guilds.cache.get(reminder.guildId);
                if (!guild) {
                    logger.warn(`Failed to send reminder ${reminder.id}: Guild ${reminder.guildId} not found`);
                    return;
                }

                const channel = guild.channels.cache.get(reminder.channelId) as TextChannel;
                if (channel && channel.isTextBased()) {
                    await channel.send(reminder.message);
                    logger.debug(`Sent channel reminder ${reminder.id} to channel ${reminder.channelId}`);
                } else {
                    logger.warn(`Failed to send reminder ${reminder.id}: Channel ${reminder.channelId} not found or not text-based`);
                }
            }
        } catch (error) {
            logError(`Error executing reminder ${reminder.id}:`, error);
        }
    }

    /**
     * Get statistics about active reminder jobs
     *
     * @returns Object with job statistics
     */
    public getStats(): { totalJobs: number; activeJobs: number } {
        return {
            totalJobs: this.reminderJobs.size,
            activeJobs: Array.from(this.reminderJobs.values()).filter(job => job.running).length,
        };
    }

    /**
     * Shutdown the reminder service
     * Stops all active cron jobs
     */
    public shutdown(): void {
        logger.info("Shutting down ReminderService...");

        for (const [id, job] of this.reminderJobs.entries()) {
            job.stop();
            logger.debug(`Stopped job ${id}`);
        }

        this.reminderJobs.clear();
        this.initialized = false;
        this.client = null;

        logger.info("ReminderService shutdown complete");
    }

    /**
     * Reset the singleton instance (for testing purposes)
     * @internal
     */
    public static resetInstance(): void {
        if (ReminderService.instance) {
            ReminderService.instance.shutdown();
            ReminderService.instance = null;
        }
    }
}

export default ReminderService;
