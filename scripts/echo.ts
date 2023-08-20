import ReminderManager, { ReminderJob } from "../src/lib/reminderv2";

const manager = new ReminderManager();

const job: ReminderJob = {
    id: "1",
    name: "awoo",
    cron: "* * * * *",
    contents: "Test",
    contentType: "TEXT",
    createdBy: "awoo",
    createdAt: new Date(),
    updatedBy: null,
    updatedAt: null,
    deleted: false,
    deletedBy: null,
    deletedAt: null,
};

manager.setCron(job.id, job);

console.log("Test executing typescript file");
