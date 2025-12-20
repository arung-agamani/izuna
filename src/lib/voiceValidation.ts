/**
 * Voice Channel Validation Utilities
 *
 * Common validation checks for music commands:
 * - Guild membership
 * - Voice channel membership
 * - Bot and user in same channel
 */

import type { GuildMember, Guild, VoiceBasedChannel, TextBasedChannel } from "discord.js";

export interface ValidationResult {
    valid: boolean;
    error?: string;
    voiceChannel?: VoiceBasedChannel;
}

/**
 * Validate that a user is in a voice channel
 * @param member - The guild member to check
 * @returns Validation result with error message if invalid
 */
export function validateUserInVoiceChannel(member: GuildMember | null | undefined): ValidationResult {
    if (!member) {
        return {
            valid: false,
            error: "You must be in voice channel first.",
        };
    }

    if (!member.voice.channel) {
        return {
            valid: false,
            error: "You must be in voice channel first.",
        };
    }

    return {
        valid: true,
        voiceChannel: member.voice.channel,
    };
}

/**
 * Validate that the bot and user are in the same voice channel
 * @param userVoiceChannel - The user's voice channel
 * @param botVoiceChannel - The bot's voice channel (can be null/undefined)
 * @param botId - The ID of the bot (client.id)
 * @param userChannel - The voice channel of the user
 * @returns Validation result with error message if invalid
 */
export function validateSameVoiceChannel(
    userVoiceChannel: VoiceBasedChannel,
    botVoiceChannel: VoiceBasedChannel | undefined | null,
    botId: string
): ValidationResult {
    // If bot is not in any voice channel, that's OK - we can join
    if (!botVoiceChannel) {
        return { valid: true, voiceChannel: userVoiceChannel };
    }

    // Check if user is in same channel as bot
    const userInBotChannel = userVoiceChannel.members.some((user) => user.id === botId);

    if (!userInBotChannel && botVoiceChannel) {
        return {
            valid: false,
            error: "You must be in the same voice channel with bot.",
        };
    }

    return { valid: true, voiceChannel: userVoiceChannel };
}

/**
 * Validate guild context
 * @param guildId - The guild ID
 * @param guild - The Guild object
 * @returns Validation result with error message if invalid
 */
export function validateGuildContext(guildId: string | null | undefined, guild: Guild | null | undefined): ValidationResult {
    if (!guildId || !guild) {
        return {
            valid: false,
            error: "This command only works in servers.",
        };
    }

    return { valid: true };
}

/**
 * Validate text channel exists
 * @param textChannel - The text channel
 * @returns Validation result with error message if invalid
 */
export function validateTextChannel(textChannel: TextBasedChannel | null | undefined): ValidationResult {
    if (!textChannel) {
        return {
            valid: false,
            error: "Text channel is undefined. This issue has been reported (should be).",
        };
    }

    return { valid: true };
}

/**
 * Combined validation for music command prerequisites
 * Performs all necessary checks in one call
 *
 * @param options - Validation options
 * @returns Validation result with all checks combined
 */
export interface CombinedValidationOptions {
    guildId: string | null | undefined;
    guild: Guild | null | undefined;
    textChannel: TextBasedChannel | null | undefined;
    member: GuildMember | null | undefined;
    botId: string;
}

export function validateMusicCommandPrerequisites(options: CombinedValidationOptions): ValidationResult {
    // Check guild context
    const guildValidation = validateGuildContext(options.guildId, options.guild);
    if (!guildValidation.valid) {
        return guildValidation;
    }

    // Check text channel
    const textValidation = validateTextChannel(options.textChannel);
    if (!textValidation.valid) {
        return textValidation;
    }

    // Check user voice channel
    const userVoiceValidation = validateUserInVoiceChannel(options.member);
    if (!userVoiceValidation.valid) {
        return userVoiceValidation;
    }

    // Check bot and user in same channel
    const botVoiceChannel = options.guild?.members.cache.get(options.botId)?.voice.channel;
    const sameChannelValidation = validateSameVoiceChannel(userVoiceValidation.voiceChannel!, botVoiceChannel, options.botId);
    if (!sameChannelValidation.valid) {
        return sameChannelValidation;
    }

    return {
        valid: true,
        voiceChannel: sameChannelValidation.voiceChannel,
    };
}
