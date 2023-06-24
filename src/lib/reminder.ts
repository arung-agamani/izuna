import type { SapphireClient } from "@sapphire/framework";
import { CronJob } from "cron";
import type { TextChannel } from "discord.js";
import type { ReminderData } from "../interfaces/bot";
import prisma from "./prisma";
import logger from "./winston";

const reminderCollection = new Map<string | number, ReminderData>();
const reminderJobs = new Set<CronJob>();

export function restartReminderJob(bot: SapphireClient) {
    logger.debug(`Currently running job count: ${reminderJobs.size}`);
    for (const job of reminderJobs) {
        job.stop();
    }
    reminderJobs.clear();
    for (const job of reminderCollection) {
        if (job[1].channelType === "DM") {
            const newJob = new CronJob(
                job[1].cronString,
                () => {
                    bot.users.cache.get(job[1].uid)?.send(job[1].message);
                },
                null,
                false,
                "Asia/Jakarta"
            );
            newJob.start();
            reminderJobs.add(newJob);
        } else if (job[1].channelType === "CHANNEL") {
            const newJob = new CronJob(
                job[1].cronString,
                () => {
                    (bot.guilds.cache.get(job[1].guildId!)?.channels.cache.get(job[1].channelId!) as TextChannel)?.send(job[1].message);
                },
                null,
                false,
                "Asia/Jakarta"
            );
            newJob.start();
            reminderJobs.add(newJob);
        }
    }
    logger.debug(`After re-init running job count: ${reminderJobs.size}`);
}

export async function init() {
    logger.info("Fetching reminder from database");
    try {
        const reminders = await prisma.reminder.findMany();
        for (const reminder of reminders) {
            reminderCollection.set(reminder.id, {
                id: String(reminder.id),
                uid: reminder.uid,
                message: reminder.message,
                cronString: reminder.cronString,
                guildId: reminder.guildId,
                channelId: reminder.channelId,
                channelType: reminder.channelType,
            });
        }
        logger.info(`Loaded ${reminderCollection.size} reminders to collection`);
    } catch (error) {
        logger.error(JSON.stringify(error));
    }
}

export default reminderCollection;
