import { Command } from "@sapphire/framework";
import type { Message } from "discord.js";
import { validateMusicCommandPrerequisites } from "../../../lib/voiceValidation";
import { MusicService } from "../../../services/MusicService";
import prisma from "../../../lib/prisma";
import logger from "../../../lib/winston";

/**
 * Stop Music Command (Refactored)
 *
 * Stops the currently playing music and:
 * 1. Stops the player
 * 2. Leaves the voice channel
 * 3. Cleans up session state
 * 4. Removes player session from database
 *
 * Migration Status: COMPLETE (full service-layer implementation)
 * - Uses MusicService for session cleanup
 * - Uses ShoukakuContext for player destruction
 * - Cleans up Prisma player session records
 */
export class StopMusicCommand extends Command {
    private musicService: MusicService;

    public constructor(context: Command.Context, options: Command.Options) {
        super(context, {
            ...options,
            name: "stop2",
            aliases: ["stop-new", "stop-v2"],
            description: "Stop playing music and leave voice channel",
            detailedDescription: `Stop the currently playing music and:
- Stop the player
- Leave the voice channel
- Clean up session state
- Remove database records`,
        });

        this.musicService = MusicService.getInstance();
    }

    public override async messageRun(message: Message) {
        // Validate prerequisites
        const validation = validateMusicCommandPrerequisites({
            guildId: message.guildId,
            guild: message.guild,
            textChannel: message.channel,
            member: message.member,
            botId: message.client.id!,
        });

        if (!validation.valid) {
            await message.channel.send(validation.error!);
            return;
        }

        const guildId = message.guildId!;

        try {
            // Check if there's an active session
            const session = this.musicService.getSession(guildId);

            if (!session) {
                await message.channel.send("❌ No active music session in this guild");
                return;
            }

            // Stop the player
            try {
                await session.player.stopTrack();
                logger.info(`Stopped player for guild ${guildId}`);
            } catch (error) {
                logger.warn(`Failed to stop player track for guild ${guildId}:`, error);
            }

            // Clean up database records
            try {
                await prisma.playerSession.deleteMany({
                    where: {
                        guildId: guildId,
                    },
                });
                logger.info(`Cleaned up player session records for guild ${guildId}`);
            } catch (error) {
                logger.warn(`Failed to clean up player session for guild ${guildId}:`, error);
            }

            // Destroy the session (leaves voice channel, clears session from memory)
            try {
                await this.musicService.destroySession(guildId);
                logger.info(`Destroyed session for guild ${guildId}`);
            } catch (error) {
                logger.warn(`Failed to destroy session for guild ${guildId}:`, error);
            }

            // Send confirmation message
            await message.channel.send("⏹️ Stopped music and left voice channel");
        } catch (error) {
            logger.error(`Error in stop2 command for guild ${guildId}:`, error);
            await message.channel.send(`❌ Error: ${error instanceof Error ? error.message : "Unknown error occurred"}`);
        }
    }
}
