import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import Filterer from "../../components/Filterer";
import Listbox from "../../components/Listbox";
import TagView, { type TagFields } from "../../components/TagView";
import api from "../lib/api";

interface GuildMembership {
    name: string;
    guildId: string;
    isAdmin: boolean;
    permissionInteger: number;
    guildPartial: {
        id: string;
        name: string;
        icon: string;
        owner: boolean;
        permissions: string;
        features: string[];
    };
}

interface GuildsResponse {
    guilds: GuildMembership[];
}

interface TagsResponse {
    tags: TagFields[];
}

const Guilds = () => {
    const [guilds, setGuilds] = useState<GuildMembership[]>([]);
    const [tags, setTags] = useState<TagFields[]>([]);
    const [filteredTags, setFilteredTags] = useState<TagFields[]>([]);
    useEffect(() => {
        (async () => {
            try {
                const data = await api.get("api/closure/user/me/guilds").json<GuildsResponse>();
                setGuilds(data.guilds);
                if (data.guilds.length > 0) {
                    selectGuild(data.guilds[0]);
                }
            } catch (error) {
                toast.error("Error when fetching current user's guilds");
            }
        })();
    }, []);

    const selectGuild = (guild: GuildMembership) => {
        (async () => {
            try {
                const data = await api.get(`api/closure/tags/me/guilds/${guild.guildId}`).json<TagsResponse>();
                setTags(data.tags);
                setFilteredTags(data.tags);
            } catch (error) {
                toast.error("Error when fetching guild tags");
            }
        })();
    };

    if (guilds.length === 0) return <p>No guilds found.</p>;
    return (
        <div>
            <p className="text-2xl">Total guilds: {guilds.length}</p>
            <p>Only returns guilds/servers where you are an administrator.</p>
            <div className="flex">
                <span className="self-center mr-4 text-xl">Select Server: </span>
                <Listbox
                    items={guilds}
                    onSelectionChange={(selected) => {
                        if (!selected) return;
                        selectGuild(selected);
                    }}
                    displayField="name"
                />
            </div>
            <div>
                <p className="text-2xl my-0">User owned tags count: {tags.length}</p>
                <Filterer data={tags} targetField="name" out={setFilteredTags} />
                {filteredTags.map((tag) => {
                    return <TagView className="mb-2" key={tag.id} {...tag} />;
                })}
            </div>
        </div>
    );
};

export default Guilds;
