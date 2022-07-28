export interface ReminderData {
    id: string;
    uid: string;
    cronString: string;
    message: string;
    channelType: string;
    guildId: string | null;
    channelId: string | null;
}
