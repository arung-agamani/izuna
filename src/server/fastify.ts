import fastify from "fastify";
import plugins from "./plugins";
import apiv1Routes from "../routes/api";
import logger, { logError, getErrorMessage } from "../lib/winston";

export async function buildServer() {
    const server = fastify({
        logger: false, // Using Winston logger instead
    });

    try {
        // Request logging — timestamp start for response-time calculation
        server.addHook("onRequest", async (request) => {
            (request.raw as unknown as { _startTime?: number })._startTime = Date.now();
        });

        // Response logging — one structured line per request
        server.addHook("onResponse", async (request, reply) => {
            const startTime = (request.raw as unknown as { _startTime?: number })._startTime;
            const responseTimeMs = startTime ? Date.now() - startTime : undefined;
            const level = reply.statusCode >= 500 ? "warn" : "info";
            logger.log(level, "http_request", {
                method: request.method,
                url: request.url.split("?")[0], // strip query string
                statusCode: reply.statusCode,
                responseTimeMs,
            });
        });

        // Catch unhandled route errors
        server.setErrorHandler((error, request, reply) => {
            logError("Unhandled route error", error, {
                method: request.method,
                url: request.url.split("?")[0],
            });
            reply.status(error.statusCode || 500).send({
                success: false,
                message: error.message || "Internal server error",
            });
        });

        // Register all plugins (CORS, Static, Auth, OAuth, Swagger)
        await server.register(plugins);

        // Register API routes
        await server.register(apiv1Routes, {
            prefix: "/api",
        });

        // 404 handler - serve index.html for SPA
        server.setNotFoundHandler((_req, res) => {
            res.sendFile("index.html");
        });

        return server;
    } catch (error) {
        logError("Failed to build server:", error);
        throw error;
    }
}
