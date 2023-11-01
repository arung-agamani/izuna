import winston, { format } from "winston";
import LokiTransport from "winston-loki";
const colors = {
    error: "red",
    warn: "yellow",
    info: "green",
    http: "magenta",
    debug: "white",
};

// winston.addColors(colors);

const logger = winston.createLogger({
    level: "info",
    format: winston.format.json(),
    transports: [
        new winston.transports.File({ filename: "log/error.log", level: "error" }),
        new winston.transports.File({ filename: "log/combined.log", level: "info" }),
        new winston.transports.File({ filename: "log/debug.log", level: "debug" }),
        new winston.transports.Console({
            format: winston.format.combine(
                format.colorize({ all: true }),
                format.timestamp({ format: "YYYY-MM-DD HH:mm:ss:ms" }),
                format.printf((info) => `${info["timestamp"]} [${info.level}] - ${info.message}`)
            ),
            level: "debug",
        }),
        new LokiTransport({
            host: process.env["LOKI_HOST"]!,
            basicAuth: `${process.env["LOKI_USER"]!}:${process.env["LOKI_PASS"]!}`,
            batching: false,
            format: winston.format.combine(format.timestamp({ format: "YYYY-MM-DD HH:mm:ss:ms" }), format.json()),
            level: "debug",
            labels: {
                app: "izuna",
                env: process.env["NODE_ENV"] === "development" ? "dev" : "prod",
            },
        }),
    ],
});

export default logger;
