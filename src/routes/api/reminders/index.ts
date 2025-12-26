import type { FastifyInstance, FastifyPluginOptions, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import ReminderService from "../../../services/ReminderService";
import logger from "../../../lib/winston";

// Validation schemas
const CreateReminderSchema = z.object({
    message: z.string().min(1, "Message cannot be empty"),
    cronString: z.string().min(1, "Cron string cannot be empty"),
    channelType: z.enum(["DM", "CHANNEL"]),
    guildId: z.string().optional(),
    channelId: z.string().min(1, "Channel ID is required"),
});

const UpdateReminderSchema = z.object({
    message: z.string().min(1, "Message cannot be empty").optional(),
    cronString: z.string().min(1, "Cron string cannot be empty").optional(),
    channelType: z.enum(["DM", "CHANNEL"]).optional(),
    guildId: z.string().optional(),
    channelId: z.string().min(1, "Channel ID is required").optional(),
});

type CreateReminderPayload = z.infer<typeof CreateReminderSchema>;
type UpdateReminderPayload = z.infer<typeof UpdateReminderSchema>;

// Type definitions for route parameters
interface ReminderIdParams {
    id: string;
}

async function reminderRoutes(fastify: FastifyInstance, _: FastifyPluginOptions) {
    const reminderService = ReminderService.getInstance();

    /**
     * GET /reminders
     * List all reminders for the authenticated user
     */
    fastify.get(
        "/",
        {
            onRequest: [fastify.authenticate],
            schema: {
                description: "List all reminders for the authenticated user",
                tags: ["reminders"],
                response: {
                    200: {
                        type: "object",
                        properties: {
                            success: { type: "boolean" },
                            data: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: {
                                        id: { type: "number" },
                                        uid: { type: "string" },
                                        message: { type: "string" },
                                        cronString: { type: "string" },
                                        channelType: { type: "string" },
                                        guildId: { type: "string" },
                                        channelId: { type: "string" },
                                    },
                                },
                            },
                            count: { type: "number" },
                        },
                    },
                },
            },
        },
        async (req: FastifyRequest, res: FastifyReply) => {
            try {
                const decodedValue = fastify.jwt.decode<{ uid: string }>(req.cookies["ninpou"]!)!;
                const reminders = await reminderService.listReminders({
                    userId: decodedValue.uid,
                });

                return {
                    success: true,
                    data: reminders,
                    count: reminders.length,
                };
            } catch (error) {
                logger.error("Error listing reminders:", error);
                res.status(500).send({
                    success: false,
                    message: "Failed to list reminders",
                    error: error instanceof Error ? error.message : "Unknown error",
                });
            }
        }
    );

    /**
     * GET /reminders/:id
     * Get a specific reminder by ID
     */
    fastify.get<{ Params: ReminderIdParams }>(
        "/:id",
        {
            onRequest: [fastify.authenticate],
            schema: {
                description: "Get a specific reminder by ID",
                tags: ["reminders"],
                params: {
                    type: "object",
                    properties: {
                        id: { type: "string" },
                    },
                    required: ["id"],
                },
                response: {
                    200: {
                        type: "object",
                        properties: {
                            success: { type: "boolean" },
                            data: {
                                type: "object",
                                properties: {
                                    id: { type: "number" },
                                    uid: { type: "string" },
                                    message: { type: "string" },
                                    cronString: { type: "string" },
                                    channelType: { type: "string" },
                                    guildId: { type: "string" },
                                    channelId: { type: "string" },
                                },
                            },
                        },
                    },
                    404: {
                        type: "object",
                        properties: {
                            success: { type: "boolean" },
                            message: { type: "string" },
                        },
                    },
                },
            },
        },
        async (req: FastifyRequest<{ Params: ReminderIdParams }>, res: FastifyReply) => {
            try {
                const decodedValue = fastify.jwt.decode<{ uid: string }>(req.cookies["ninpou"]!)!;
                const reminderId = parseInt(req.params.id, 10);

                if (isNaN(reminderId)) {
                    return res.status(400).send({
                        success: false,
                        message: "Invalid reminder ID",
                    });
                }

                const reminder = await reminderService.getReminderForUser(reminderId, decodedValue.uid);

                if (!reminder) {
                    return res.status(404).send({
                        success: false,
                        message: "Reminder not found",
                    });
                }

                return {
                    success: true,
                    data: reminder,
                };
            } catch (error) {
                logger.error(`Error fetching reminder ${req.params.id}:`, error);
                res.status(500).send({
                    success: false,
                    message: "Failed to fetch reminder",
                    error: error instanceof Error ? error.message : "Unknown error",
                });
            }
        }
    );

    /**
     * POST /reminders
     * Create a new reminder
     */
    fastify.post(
        "/",
        {
            onRequest: [fastify.authenticate],
            schema: {
                description: "Create a new reminder",
                tags: ["reminders"],
                body: {
                    type: "object",
                    required: ["message", "cronString", "channelType", "channelId"],
                    properties: {
                        message: { type: "string" },
                        cronString: { type: "string" },
                        channelType: { type: "string", enum: ["DM", "CHANNEL"] },
                        guildId: { type: "string" },
                        channelId: { type: "string" },
                    },
                },
                response: {
                    201: {
                        type: "object",
                        properties: {
                            success: { type: "boolean" },
                            message: { type: "string" },
                            data: {
                                type: "object",
                                properties: {
                                    id: { type: "number" },
                                    uid: { type: "string" },
                                    message: { type: "string" },
                                    cronString: { type: "string" },
                                    channelType: { type: "string" },
                                    guildId: { type: "string" },
                                    channelId: { type: "string" },
                                },
                            },
                        },
                    },
                },
            },
        },
        async (req: FastifyRequest, res: FastifyReply) => {
            try {
                const decodedValue = fastify.jwt.decode<{ uid: string }>(req.cookies["ninpou"]!)!;
                const payload = req.body as CreateReminderPayload;

                // Validate the payload
                const validation = CreateReminderSchema.safeParse(payload);
                if (!validation.success) {
                    return res.status(400).send({
                        success: false,
                        message: "Validation error",
                        errors: validation.error.errors,
                    });
                }

                // Validate cron string
                if (!reminderService.validateCronString(payload.cronString)) {
                    return res.status(400).send({
                        success: false,
                        message: "Invalid cron string format",
                    });
                }

                // Create the reminder
                const reminder = await reminderService.createReminder({
                    uid: decodedValue.uid,
                    message: payload.message,
                    cronString: payload.cronString,
                    channelType: payload.channelType,
                    guildId: payload.guildId,
                    channelId: payload.channelId,
                });

                return res.status(201).send({
                    success: true,
                    message: "Reminder created successfully",
                    data: reminder,
                });
            } catch (error) {
                logger.error("Error creating reminder:", error);
                res.status(500).send({
                    success: false,
                    message: "Failed to create reminder",
                    error: error instanceof Error ? error.message : "Unknown error",
                });
            }
        }
    );

    /**
     * PATCH /reminders/:id
     * Update an existing reminder
     */
    fastify.patch<{ Params: ReminderIdParams }>(
        "/:id",
        {
            onRequest: [fastify.authenticate],
            schema: {
                description: "Update an existing reminder",
                tags: ["reminders"],
                params: {
                    type: "object",
                    properties: {
                        id: { type: "string" },
                    },
                    required: ["id"],
                },
                body: {
                    type: "object",
                    properties: {
                        message: { type: "string" },
                        cronString: { type: "string" },
                        channelType: { type: "string", enum: ["DM", "CHANNEL"] },
                        guildId: { type: "string" },
                        channelId: { type: "string" },
                    },
                },
                response: {
                    200: {
                        type: "object",
                        properties: {
                            success: { type: "boolean" },
                            message: { type: "string" },
                            data: {
                                type: "object",
                                properties: {
                                    id: { type: "number" },
                                    uid: { type: "string" },
                                    message: { type: "string" },
                                    cronString: { type: "string" },
                                    channelType: { type: "string" },
                                    guildId: { type: "string" },
                                    channelId: { type: "string" },
                                },
                            },
                        },
                    },
                },
            },
        },
        async (req: FastifyRequest<{ Params: ReminderIdParams }>, res: FastifyReply) => {
            try {
                const decodedValue = fastify.jwt.decode<{ uid: string }>(req.cookies["ninpou"]!)!;
                const reminderId = parseInt(req.params.id, 10);
                const payload = req.body as UpdateReminderPayload;

                if (isNaN(reminderId)) {
                    return res.status(400).send({
                        success: false,
                        message: "Invalid reminder ID",
                    });
                }

                // Validate the payload
                const validation = UpdateReminderSchema.safeParse(payload);
                if (!validation.success) {
                    return res.status(400).send({
                        success: false,
                        message: "Validation error",
                        errors: validation.error.errors,
                    });
                }

                // Check if reminder exists and belongs to user
                const existing = await reminderService.getReminderForUser(reminderId, decodedValue.uid);
                if (!existing) {
                    return res.status(404).send({
                        success: false,
                        message: "Reminder not found",
                    });
                }

                // Validate cron string if provided
                if (payload.cronString && !reminderService.validateCronString(payload.cronString)) {
                    return res.status(400).send({
                        success: false,
                        message: "Invalid cron string format",
                    });
                }

                // Update the reminder
                const reminder = await reminderService.updateReminder(reminderId, {
                    message: payload.message,
                    cronString: payload.cronString,
                    channelType: payload.channelType,
                    guildId: payload.guildId,
                    channelId: payload.channelId,
                });

                return {
                    success: true,
                    message: "Reminder updated successfully",
                    data: reminder,
                };
            } catch (error) {
                logger.error(`Error updating reminder ${req.params.id}:`, error);
                res.status(500).send({
                    success: false,
                    message: "Failed to update reminder",
                    error: error instanceof Error ? error.message : "Unknown error",
                });
            }
        }
    );

    /**
     * DELETE /reminders/:id
     * Delete a reminder
     */
    fastify.delete<{ Params: ReminderIdParams }>(
        "/:id",
        {
            onRequest: [fastify.authenticate],
            schema: {
                description: "Delete a reminder",
                tags: ["reminders"],
                params: {
                    type: "object",
                    properties: {
                        id: { type: "string" },
                    },
                    required: ["id"],
                },
                response: {
                    200: {
                        type: "object",
                        properties: {
                            success: { type: "boolean" },
                            message: { type: "string" },
                        },
                    },
                },
            },
        },
        async (req: FastifyRequest<{ Params: ReminderIdParams }>, res: FastifyReply) => {
            try {
                const decodedValue = fastify.jwt.decode<{ uid: string }>(req.cookies["ninpou"]!)!;
                const reminderId = parseInt(req.params.id, 10);

                if (isNaN(reminderId)) {
                    return res.status(400).send({
                        success: false,
                        message: "Invalid reminder ID",
                    });
                }

                // Check if reminder exists and belongs to user
                const existing = await reminderService.getReminderForUser(reminderId, decodedValue.uid);
                if (!existing) {
                    return res.status(404).send({
                        success: false,
                        message: "Reminder not found",
                    });
                }

                // Delete the reminder
                await reminderService.deleteReminder(reminderId);

                return {
                    success: true,
                    message: "Reminder deleted successfully",
                };
            } catch (error) {
                logger.error(`Error deleting reminder ${req.params.id}:`, error);
                res.status(500).send({
                    success: false,
                    message: "Failed to delete reminder",
                    error: error instanceof Error ? error.message : "Unknown error",
                });
            }
        }
    );

    /**
     * GET /reminders/stats
     * Get reminder statistics for the authenticated user
     */
    fastify.get(
        "/stats",
        {
            onRequest: [fastify.authenticate],
            schema: {
                description: "Get reminder statistics",
                tags: ["reminders"],
                response: {
                    200: {
                        type: "object",
                        properties: {
                            success: { type: "boolean" },
                            data: {
                                type: "object",
                                properties: {
                                    totalReminders: { type: "number" },
                                    dmReminders: { type: "number" },
                                    channelReminders: { type: "number" },
                                },
                            },
                        },
                    },
                },
            },
        },
        async (req: FastifyRequest, res: FastifyReply) => {
            try {
                const decodedValue = fastify.jwt.decode<{ uid: string }>(req.cookies["ninpou"]!)!;
                const reminders = await reminderService.listReminders({
                    userId: decodedValue.uid,
                });

                const stats = {
                    totalReminders: reminders.length,
                    dmReminders: reminders.filter((r) => r.channelType === "DM").length,
                    channelReminders: reminders.filter((r) => r.channelType === "CHANNEL").length,
                };

                return {
                    success: true,
                    data: stats,
                };
            } catch (error) {
                logger.error("Error fetching reminder stats:", error);
                res.status(500).send({
                    success: false,
                    message: "Failed to fetch reminder statistics",
                    error: error instanceof Error ? error.message : "Unknown error",
                });
            }
        }
    );
}

export default reminderRoutes;
