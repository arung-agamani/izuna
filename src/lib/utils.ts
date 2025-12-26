// taken from https://stackoverflow.com/a/11486026
export function fancyTimeFormat(duration: number) {
    // Hours, minutes and seconds
    var hrs = ~~(duration / 3600);
    var mins = ~~((duration % 3600) / 60);
    var secs = ~~duration % 60;

    // Output like "1:01" or "4:03:59" or "123:03:59"
    var ret = "";

    if (hrs > 0) {
        ret += "" + hrs + ":" + (mins < 10 ? "0" : "");
    }

    ret += "" + mins + ":" + (secs < 10 ? "0" : "");
    ret += "" + secs;
    return ret;
}

/**
 * Parse time string in format [hh:][mm:]ss to seconds
 * @param timeString - Time string (e.g., "40", "1:10", "1:1:10")
 * @returns Number of seconds
 * @throws Error if format is invalid
 */
export function parseTimeString(timeString: string): number {
    const digitsRegex = /^[0-9]{1,2}$/;
    const parts = timeString.split(":");

    // Validate each part
    for (const part of parts) {
        if (!digitsRegex.test(part) || Number(part) < 0) {
            throw new Error("Invalid time format. Please use format [hh:][mm:]ss");
        }
    }

    let seconds = 0;

    if (parts.length === 3) {
        // hh:mm:ss
        seconds += Number(parts[0]) * 3600;
        seconds += Number(parts[1]) * 60;
        seconds += Number(parts[2]);
    } else if (parts.length === 2) {
        // mm:ss
        seconds += Number(parts[0]) * 60;
        seconds += Number(parts[1]);
    } else if (parts.length === 1) {
        // ss
        seconds += Number(parts[0]);
    } else {
        throw new Error("Invalid time format. Please use format [hh:][mm:]ss");
    }

    return seconds;
}
