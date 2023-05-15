import { atom } from "recoil";

export interface PartialGuild {
    id: string;
    name: string;
    icon: string;
    owner: boolean;
    permissions: string;
    features: string[];
}

export interface GuildMembership {
    name: string;
    guildId: string;
    isAdmin: boolean;
    permissionInteger: number;
    guildPartial: PartialGuild;
}

export interface DiscordGuildsState {
    name: string;
    id: number;
    uid: string;
    guilds: GuildMembership[];
}

export const GuildsAtom = atom<DiscordGuildsState>({
    key: "guilds",
    default: {
        name: "",
        id: -1,
        uid: "",
        guilds: [],
    },
});
