import winston, { format } from "winston";
import LokiTransport from "winston-loki";

const isDevelopment = process.env["NODE_ENV"] === "development";
const isTest = process.env["NODE_ENV"] === "test";
const appVersion: string = (() => { try { return require("../../package.json").version; } catch { return "unknown"; } })();

/**
 * Convert an unknown error value to a safe string for logging.
 * Use in log metadata to avoid [object Object] when the error is not an Error instance.
 */
export function getErrorMessage(err: unknown): string {
    if (err instanceof Error) return err.message;
    if (typeof err === "string") return err;
    return String(err);
}

/**
 * Log an error with full stack preservation.
 * Passes the Error object through winston so format.errors({ stack: true }) extracts the trace.
 * Use this instead of getErrorMessage + logger.error for all error logging.
 */
export function logError(scope: string, err: unknown, meta?: Record<string, unknown>) {
    logger.error(scope, { ...(err instanceof Error ? { error: err } : { error: String(err) }), ...meta });
}

const logger = winston.createLogger({
    level: isDevelopment ? "debug" : "info",
    format: format.combine(
        format.timestamp(),
        format.errors({ stack: true }),
        format.json(),
    ),
    // Under NODE_ENV=test (vitest) use a silent transport — no log files, no console noise.
    transports: isTest
        ? [new winston.transports.Console({ silent: true })]
        : [
              new winston.transports.File({ filename: "log/error.log", level: "error" }),
              new winston.transports.File({ filename: "log/combined.log", level: "info" }),
              new winston.transports.File({ filename: "log/debug.log", level: "debug" }),
              new winston.transports.Console({
                  format: format.combine(
                      format.colorize({ all: true }),
                      format.timestamp(),
                      format.printf((info) => {
                          const { timestamp, level, message, ...rest } = info as Record<string, unknown>;
                          const meta = Object.keys(rest).length > 0 ? ` ${JSON.stringify(rest)}` : "";
                          return `${timestamp} [${level}] - ${message}${meta}`;
                      }),
                  ),
                  level: isDevelopment ? "debug" : "info",
              }),
          ],
});

// Loki transport — only when LOKI_HOST is set (same opt-in pattern as USE_LOCAL_LAVALINK / MUTE)
const lokiHost = process.env["LOKI_HOST"];
if (lokiHost) {
    logger.add(
        new LokiTransport({
            host: lokiHost,
            basicAuth:
                process.env["LOKI_USER"] && process.env["LOKI_PASS"] ? `${process.env["LOKI_USER"]}:${process.env["LOKI_PASS"]}` : undefined,
            batching: true,
            interval: 2, // flush every 2 seconds
            json: true, // JSON over HTTP (no protobuf native dep)
            replaceTimestamp: true, // Loki nanosecond timestamp
            timeout: 10_000, // 10 s HTTP timeout
            gracefulShutdown: true,
            onConnectionError: (err: unknown) => {
                // Use console directly — don't loop through the logger if Loki is the problem
                console.error("[loki] Connection error:", err);
            },
            labels: {
                app: "izuna",
                env: isDevelopment ? "dev" : "prod",
                version: appVersion,
            },
        }),
    );
    logger.info("Loki transport enabled", { host: lokiHost });
} else {
    logger.info("Loki transport not configured (LOKI_HOST unset) — logs go to file + console only");
}

export default logger;
