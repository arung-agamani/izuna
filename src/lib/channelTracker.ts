import prisma from "./prisma";
import logger from "./winston";

export const joinToCreateVoiceChatManager = new Map<string, string>();
export const channelTrackingManager = new Set<string>();

export async function initializeJoinToCreateVCManager() {
    const allTrackedVC = await prisma.joinToCreateVC.findMany();
    for (const trackedVC of allTrackedVC) {
        if (!joinToCreateVoiceChatManager.has(trackedVC.guildId)) {
            joinToCreateVoiceChatManager.set(trackedVC.guildId, trackedVC.parentChannelId);
        }
    }
}

export async function initializeChannelTrackingManager() {
    const allTrackedVC = await prisma.ephemeralVC.findMany();
    for (const trackedVC of allTrackedVC) {
        if (!channelTrackingManager.has(`${trackedVC.guildId}-${trackedVC.channelId}`)) {
            channelTrackingManager.add(`${trackedVC.guildId}-${trackedVC.channelId}`);
        }
    }
}

export async function addToJ2CVCManager(guildId: string, channelId: string) {
    try {
        await prisma.joinToCreateVC.upsert({
            create: {
                guildId,
                parentChannelId: channelId,
            },
            where: {
                guildId,
            },
            update: {
                parentChannelId: channelId,
            },
        });
        logger.info(`db::join2create - Added record guildId: ${guildId} - channelId: ${channelId}`);
        joinToCreateVoiceChatManager.set(guildId, channelId);
    } catch (error) {
        logger.error(`db::join2create - Failed to add record guildId: ${guildId} - channelId: ${channelId}`);
        logger.error(error);
    }
}

export async function deleteFromJ2CVCManager(guildId: string) {
    try {
        await prisma.joinToCreateVC.delete({
            where: {
                guildId,
            },
        });
        logger.info(`db::join2create - Deleted record guildId: ${guildId}`);
        joinToCreateVoiceChatManager.delete(guildId);
    } catch (error) {
        logger.error(`db::join2create - Failed to delete record ${guildId}`);
        logger.error(error);
    }
}

export async function addToEphemeralVCManager(guildId: string, channelId: string) {
    try {
        await prisma.ephemeralVC.create({
            data: {
                guildId,
                channelId,
            },
        });
        logger.info(`db::ephemeral-vc - Added record guildId: ${guildId} channelId: ${channelId}`);
        channelTrackingManager.add(`${guildId}-${channelId}`);
    } catch (error) {
        logger.error(`db::ephemeral-vc - Failed to create record guildId: ${guildId} - channelId: ${channelId}`);
        logger.error(error);
    }
}

export async function deleteFromEphemeralVCManager(guildId: string, channelId: string) {
    try {
        await prisma.ephemeralVC.delete({
            where: {
                guildId_channelId: {
                    guildId,
                    channelId,
                },
            },
        });
        logger.info(`db::ephemeral-vc - Deleted record guildId: ${guildId} channelId: ${channelId}`);
        channelTrackingManager.delete(`${guildId}-${channelId}`);
    } catch (error) {
        logger.error(`db::ephemeral-vc - Failed to delete record ${guildId}-${channelId}`);
        logger.error(error);
    }
}
