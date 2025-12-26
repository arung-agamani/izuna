/**
 * Cron Utilities
 *
 * Provides user-friendly interfaces for creating cron expressions
 * without requiring users to understand cron syntax.
 */

export type DayOfWeek = "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday";
export type TimeUnit = "minutes" | "hours" | "days" | "weeks";

/**
 * Convert a day name to a cron day number (0 = Sunday, 1 = Monday, etc.)
 */
function dayToCronNumber(day: DayOfWeek): number {
    const dayMap: Record<DayOfWeek, number> = {
        sunday: 0,
        monday: 1,
        tuesday: 2,
        wednesday: 3,
        thursday: 4,
        friday: 5,
        saturday: 6,
    };
    return dayMap[day];
}

/**
 * Parse time string in format "HH:MM" (24-hour format)
 * @returns Object with hour and minute, or null if invalid
 */
function parseTime(timeStr: string): { hour: number; minute: number } | null {
    const match = timeStr.match(/^(\d{1,2}):(\d{2})$/);
    if (!match) return null;

    const hour = parseInt(match[1], 10);
    const minute = parseInt(match[2], 10);

    if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
        return null;
    }

    return { hour, minute };
}

/**
 * Create a cron string for a daily reminder at a specific time
 * @param time - Time in "HH:MM" format (24-hour)
 * @returns Cron string (e.g., "0 9 * * *" for 9:00 AM daily)
 */
export function createDailyCron(time: string): string | null {
    const parsed = parseTime(time);
    if (!parsed) return null;

    return `${parsed.minute} ${parsed.hour} * * *`;
}

/**
 * Create a cron string for a weekly reminder on specific day(s) at a specific time
 * @param days - Array of day names
 * @param time - Time in "HH:MM" format (24-hour)
 * @returns Cron string
 */
export function createWeeklyCron(days: DayOfWeek[], time: string): string | null {
    const parsed = parseTime(time);
    if (!parsed || days.length === 0) return null;

    const dayNumbers = days.map(dayToCronNumber).sort((a, b) => a - b);
    const daysStr = dayNumbers.join(",");

    return `${parsed.minute} ${parsed.hour} * * ${daysStr}`;
}

/**
 * Create a cron string for a monthly reminder on a specific day of the month
 * @param dayOfMonth - Day of month (1-31)
 * @param time - Time in "HH:MM" format (24-hour)
 * @returns Cron string
 */
export function createMonthlyCron(dayOfMonth: number, time: string): string | null {
    const parsed = parseTime(time);
    if (!parsed || dayOfMonth < 1 || dayOfMonth > 31) return null;

    return `${parsed.minute} ${parsed.hour} ${dayOfMonth} * *`;
}

/**
 * Create a cron string for an interval-based reminder
 * @param interval - Number of time units
 * @param unit - Time unit (minutes, hours, days)
 * @returns Cron string or @every expression
 */
export function createIntervalCron(interval: number, unit: TimeUnit): string | null {
    if (interval <= 0) return null;

    switch (unit) {
        case "minutes":
            if (interval >= 60) return null; // Use hours instead
            return `*/${interval} * * * *`;

        case "hours":
            if (interval >= 24) return null; // Use days instead
            return `0 */${interval} * * *`;

        case "days":
            return `0 0 */${interval} * *`;

        case "weeks":
            return `0 0 * * 0`; // Weekly on Sunday at midnight (can't do multi-week intervals easily in cron)

        default:
            return null;
    }
}

/**
 * Get a human-readable description of a cron string
 * This is a simplified version - for production, consider using a library like cronstrue
 */
export function describeCron(cronString: string): string {
    // Handle special strings
    if (cronString === "@yearly" || cronString === "@annually") return "Once a year";
    if (cronString === "@monthly") return "Once a month";
    if (cronString === "@weekly") return "Once a week";
    if (cronString === "@daily") return "Once a day";
    if (cronString === "@hourly") return "Every hour";

    // Handle @every syntax
    const everyMatch = cronString.match(/@every (\d+)(\w+)/);
    if (everyMatch) {
        return `Every ${everyMatch[1]}${everyMatch[2]}`;
    }

    // Parse standard cron format
    const parts = cronString.trim().split(/\s+/);
    if (parts.length < 5) return cronString;

    const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;

    // Daily pattern
    if (dayOfMonth === "*" && month === "*" && dayOfWeek === "*") {
        if (hour.includes("/")) {
            const interval = hour.split("/")[1];
            return `Every ${interval} hour(s)`;
        }
        if (minute.includes("/") && hour === "*") {
            const interval = minute.split("/")[1];
            return `Every ${interval} minute(s)`;
        }
        return `Daily at ${hour.padStart(2, "0")}:${minute.padStart(2, "0")}`;
    }

    // Weekly pattern
    if (dayOfMonth === "*" && month === "*" && dayOfWeek !== "*") {
        const days = dayOfWeek.split(",").map((d) => {
            const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
            return dayNames[parseInt(d)] || d;
        });
        return `Weekly on ${days.join(", ")} at ${hour.padStart(2, "0")}:${minute.padStart(2, "0")}`;
    }

    // Monthly pattern
    if (dayOfMonth !== "*" && month === "*") {
        return `Monthly on day ${dayOfMonth} at ${hour.padStart(2, "0")}:${minute.padStart(2, "0")}`;
    }

    return cronString;
}

/**
 * Validate a cron string
 */
export function validateCronString(cronString: string): boolean {
    const cronRegex =
        /(@(annually|yearly|monthly|weekly|daily|hourly|reboot))|(@every (\d+(ns|us|µs|ms|s|m|h))+)|((((\d+,)+\d+|(\d+(\/|-)\d+)|\d+|\*) ?){5,7})/;
    return cronRegex.test(cronString);
}

/**
 * Predefined cron patterns for common use cases
 */
export const PRESET_CRONS = {
    EVERY_MINUTE: "* * * * *",
    EVERY_5_MINUTES: "*/5 * * * *",
    EVERY_15_MINUTES: "*/15 * * * *",
    EVERY_30_MINUTES: "*/30 * * * *",
    EVERY_HOUR: "0 * * * *",
    EVERY_2_HOURS: "0 */2 * * *",
    EVERY_6_HOURS: "0 */6 * * *",
    EVERY_12_HOURS: "0 */12 * * *",
    DAILY_9AM: "0 9 * * *",
    DAILY_NOON: "0 12 * * *",
    DAILY_6PM: "0 18 * * *",
    DAILY_MIDNIGHT: "0 0 * * *",
    WEEKLY_MONDAY_9AM: "0 9 * * 1",
    WEEKLY_FRIDAY_5PM: "0 17 * * 5",
    MONTHLY_1ST_9AM: "0 9 1 * *",
    EVERY_JUMATAN: "50 11 * * 5",
} as const;

/**
 * Get preset cron choices for Discord slash command autocomplete
 */
export function getPresetChoices(): Array<{ name: string; value: string }> {
    return [
        { name: "Every 5 minutes", value: PRESET_CRONS.EVERY_5_MINUTES },
        { name: "Every 15 minutes", value: PRESET_CRONS.EVERY_15_MINUTES },
        { name: "Every 30 minutes", value: PRESET_CRONS.EVERY_30_MINUTES },
        { name: "Every hour", value: PRESET_CRONS.EVERY_HOUR },
        { name: "Every 2 hours", value: PRESET_CRONS.EVERY_2_HOURS },
        { name: "Every 6 hours", value: PRESET_CRONS.EVERY_6_HOURS },
        { name: "Daily at 9:00 AM", value: PRESET_CRONS.DAILY_9AM },
        { name: "Daily at 12:00 PM (Noon)", value: PRESET_CRONS.DAILY_NOON },
        { name: "Daily at 6:00 PM", value: PRESET_CRONS.DAILY_6PM },
        { name: "Daily at Midnight", value: PRESET_CRONS.DAILY_MIDNIGHT },
        { name: "Weekly - Monday at 9:00 AM", value: PRESET_CRONS.WEEKLY_MONDAY_9AM },
        { name: "Weekly - Friday at 5:00 PM", value: PRESET_CRONS.WEEKLY_FRIDAY_5PM },
        { name: "Monthly - 1st day at 9:00 AM", value: PRESET_CRONS.MONTHLY_1ST_9AM },
        { name: "Every Jumatan (Friday at 11:50 AM)", value: PRESET_CRONS.EVERY_JUMATAN },
    ];
}
