import winston, { format } from "winston";
import LokiTransport from "winston-loki";
const colors = {
    error: "red",
    warn: "yellow",
    info: "green",
    http: "magenta",
    debug: "white",
};

winston.addColors(colors);

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
        }),
        new LokiTransport({
            host: process.env["NODE_ENV"] === "development" ? "http://localhost:3100" : "http://loki:3100",
            batching: false,
            format: winston.format.combine(format.timestamp({ format: "YYYY-MM-DD HH:mm:ss:ms" }), format.label({ label: "closure" }), format.json()),
            level: "debug",
            labels: {
                app: "closure",
            },
        }),
    ],
});

export default logger;
