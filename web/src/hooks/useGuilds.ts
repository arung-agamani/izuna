import { useQuery } from "@tanstack/react-query";
import api from "../routes/lib/api";

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

interface GuildsResponse {
    data: GuildMembership[];
    count: number;
}

const emptyGuilds: DiscordGuildsState = {
    name: "",
    id: -1,
    uid: "",
    guilds: [],
};

export function useGuilds() {
    return useQuery<DiscordGuildsState>({
        queryKey: ["guilds"],
        queryFn: async () => {
            const data = await api.get("api/izuna/users/me/guilds").json<GuildsResponse>();
            return { name: "", uid: "", id: 0, guilds: data.data };
        },
        staleTime: 5 * 60 * 1000,
        retry: false,
        placeholderData: emptyGuilds,
    });
}
