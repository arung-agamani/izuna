import cron from "cron";
import prisma from "./prisma";
// create reminder manager

// ccreate reminder interface

type ContentType = "TEXT" | "MEDIA_IMAGE" | "MEDIA_VIDEO" | "MEDIA_FILE";

export interface ReminderJob {
    id: string;
    name: string;
    cron: string;
    contents: string;
    contentType: ContentType;
    createdBy: string;
    createdAt: Date;
    updatedBy: string | null;
    updatedAt: Date | null;
    deleted: Boolean;
    deletedBy: string | null;
    deletedAt: Date | null;
}

function sendBotMessage(targetType: "user" | "channel", targetChannel: string, content: string) {
    console.log(`Sending message to ${targetType} on ${targetChannel} with contents: ${content}`);
}

export default class ReminderManager {
    public cronMap: Map<string, [ReminderJob, cron.CronJob]>;
    constructor() {
        this.cronMap = new Map<string, [ReminderJob, cron.CronJob]>();
        this.sync();
    }

    async sync() {
        // clean existing if exist
        const jobs = this.cronMap.values();
        for (const job of jobs) {
            job[1].stop();
        }
        this.cronMap.clear();

        const reminders = await prisma.reminderService.findMany({});
        for (const item of reminders) {
            this.setCron(item.id, item);
        }
    }

    getCron(id: string) {
        const cronJob = this.cronMap.get(id);
        return cronJob;
    }

    setCron(id: string, job: ReminderJob) {
        // handle overwrite
        const existingCronJob = this.cronMap.get(id);
        if (existingCronJob) {
            existingCronJob[1].stop();
            this.cronMap.delete(id);
        }
        // create new
        const cronJob = new cron.CronJob(
            job.cron,
            () => {
                sendBotMessage("user", job.id, job.contents);
            },
            null,
            true,
            "Asia/Jakarta"
        );
        this.cronMap.set(id, [job, cronJob]);
    }

    deleteCron(id: string) {
        const existingCronJob = this.cronMap.get(id);
        if (existingCronJob) {
            existingCronJob[1].stop();
            this.cronMap.delete(id);
        }
    }
}
