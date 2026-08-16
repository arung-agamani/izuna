const { PrismaClient } = require("@prisma/client");
const dotenv = require("dotenv");
const tz = require("date-fns-tz");

dotenv.config();

const prisma = new PrismaClient();

async function addReminder() {
    const entry = await prisma.reminderService.create({
        data: {
            name: "test reminder",
            cron: "* * * * *",
            contents: "aa",
            contentType: "TEXT",
            createdAt: tz.utcToZonedTime(new Date(), "Asia/Jakarta"),
            createdBy: "awoo",
        },
    });

    if (!entry) {
        console.log("No entry created");
        return;
    }

    console.log("New entry has been creawted");
    console.log(entry);
}

async function getReminders() {
    const reminders = await prisma.reminderService.findMany({});
    if (reminders.length === 0) {
        console.log("Reminders returned 0 results");
        return;
    }
    for (const item of reminders) {
        console.log(new Date(item.createdAt.getTime() - item.createdAt.getTimezoneOffset() * 60 * 1000).toISOString());
        console.log(item.createdAt.toLocaleString());
    }
    console.log(`Reminders returned ${reminders.length} results`);
    // console.log(reminders);
}

function main() {
    // console.log("Start");
    // addReminder().then(() => {
    getReminders().then(() => {
        console.log("Done");
    });
    // });
}

main();
