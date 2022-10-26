import { Listener } from "@sapphire/framework";
import type { VoiceState, VoiceBasedChannel } from "discord.js";
import { joinToCreateVoiceChatManager, channelTrackingManager, deleteFromEphemeralVCManager, addToEphemeralVCManager } from "../../lib/channelTracker";
import logger from "../../lib/winston";

export class VoiceStateUpdateListener extends Listener {
    public constructor(context: Listener.Context, options: Listener.Options) {
        super(context, {
            ...options,
        });
    }

    public async run(oldVoiceState: VoiceState, newVoiceState: VoiceState) {
        if (newVoiceState.member?.user.bot) return;
        if (newVoiceState.channelId === oldVoiceState.channelId) return;
        // check if guild has voice channel to track
        const parentChannelId = joinToCreateVoiceChatManager.get(newVoiceState.guild.id);
        if (!parentChannelId) return;

        if (newVoiceState.channelId === parentChannelId) {
            // user joins channel
            // check if previous channel also tracked
            {
                const client = this.container.client;
                const guild = client.guilds.cache.get(newVoiceState.guild.id)!;
                const previousVoiceChannelId = oldVoiceState.channelId!;
                logger.debug(`Previous voice channel id: ${previousVoiceChannelId}`);
                let targetVoiceChannel;
                try {
                    targetVoiceChannel = await guild.channels.fetch(previousVoiceChannelId);
                } catch (error) {
                    logger.warn(`${previousVoiceChannelId} fetch error. Might have been deleted`);
                    targetVoiceChannel = null;
                }
                if (targetVoiceChannel) {
                    const previousVoiceChannel = await guild.channels.cache.get(previousVoiceChannelId);
                    if (previousVoiceChannel) {
                        let totalMember = (previousVoiceChannel as VoiceBasedChannel).members.size;
                        logger.debug(`${targetVoiceChannel.name} has ${totalMember} people inside`);
                        if (totalMember === 0 && channelTrackingManager.has(`${guild.id}-${targetVoiceChannel.id}`)) {
                            // destroy channel
                            try {
                                await guild.channels.delete(targetVoiceChannel);
                            } catch (error) {
                                logger.warn(`${targetVoiceChannel.name} has already deleted or non-existent or error`);
                            }
                            await deleteFromEphemeralVCManager(guild.id, previousVoiceChannelId);
                        }
                    }
                }
            }
            // create channel
            const client = this.container.client;
            const guild = client.guilds.cache.get(newVoiceState.guild.id)!;
            const user = guild.members.cache.get(newVoiceState.id)!;
            const category = newVoiceState.channel?.parent;
            let createdVoiceChannel;
            const channelNameToCreate = `${user.displayName}'s Channel`;
            if (category) {
                createdVoiceChannel = await category.createChannel(channelNameToCreate, {
                    type: "GUILD_VOICE",
                });
            } else {
                createdVoiceChannel = await guild.channels.create(channelNameToCreate, {
                    type: "GUILD_VOICE",
                });
            }
            logger.debug(`${createdVoiceChannel.name} voice channel is created`);
            await addToEphemeralVCManager(guild.id, createdVoiceChannel.id);
            logger.debug(`${guild.id}-${createdVoiceChannel.id} added to tracking manager`);
            user.voice.setChannel(createdVoiceChannel);
            logger.debug(`Moving user ${user.nickname} to voice channel ${createdVoiceChannel.name}`);
            // move user to channel
            return;
        }
        if (newVoiceState.channelId !== oldVoiceState.channelId) {
            // user leaves/moves channel
            // check if channel user count is zero
            const client = this.container.client;
            const guild = client.guilds.cache.get(newVoiceState.guild.id)!;
            const previousVoiceChannelId = oldVoiceState.channelId!;
            if (previousVoiceChannelId === parentChannelId) return;
            let targetVoiceChannel;
            try {
                targetVoiceChannel = await guild.channels.fetch(previousVoiceChannelId);
            } catch (error) {
                logger.warn(`${previousVoiceChannelId} fetch error. Might have been deleted`);
                targetVoiceChannel = null;
            }
            if (targetVoiceChannel) {
                const previousVoiceChannel = await guild.channels.fetch(previousVoiceChannelId);
                if (previousVoiceChannel) {
                    let totalMember = (previousVoiceChannel as VoiceBasedChannel).members.size;
                    logger.debug(`${targetVoiceChannel.name} has ${totalMember} people inside`);
                    if (totalMember !== 0) return;
                    if (!channelTrackingManager.has(`${guild.id}-${targetVoiceChannel.id}`)) return;
                    // destroy channel
                    try {
                        await guild.channels.delete(targetVoiceChannel);
                    } catch (error) {
                        logger.warn(`${targetVoiceChannel.name} has already deleted or non-existent or error`);
                    }
                    await deleteFromEphemeralVCManager(guild.id, previousVoiceChannelId);
                }
            }
        }
    }
}
