import winston, { format } from "winston";
const colors = {
    error: "red",
    warn: "yellow",
    info: "green",
    http: "magenta",
    debug: "white",
};

winston.addColors(colors);

const logger = winston.createLogger({
    level: "debug",
    format: winston.format.json(),
    transports: [
        new winston.transports.File({ filename: "log/error.log", level: "error" }),
        new winston.transports.File({ filename: "log/combined.log", level: "info" }),
        new winston.transports.Console({
            format: winston.format.combine(
                format.colorize({ all: true }),
                format.timestamp({ format: "YYYY-MM-DD HH:mm:ss:ms" }),
                format.printf((info) => `${info["timestamp"]} [${info.level}] - ${info.message}`)
            ),
        }),
    ],
});

export default logger;
