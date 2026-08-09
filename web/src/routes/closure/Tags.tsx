import { useEffect, useState } from "react";
import api from "../lib/api";
import TagView, { TagFields as Tag } from "../../components/TagView";
import Filterer from "../../components/Filterer";

interface TagsResponse {
    data: Tag[];
    count: number;
}

const Tags = () => {
    const [tags, setTags] = useState<Tag[]>([]);
    const [filteredTags, setFilteredTags] = useState<Tag[]>([]);

    useEffect(() => {
        (async () => {
            try {
                const data = await api.get("api/izuna/users/me/tags").json<TagsResponse>();
                setTags(data.data);
                setFilteredTags(data.data);
            } catch (error) {
                alert("Failed on fetching tags");
            }
        })();
    }, []);
    if (!tags) return <p>Fetching...</p>;
    return (
        <div>
            <p className="text-2xl">User owned tags count: {tags.length}</p>
            <Filterer data={tags} advancedFilter shape={{ isMedia: true, isGuild: true, guildId: "" }} targetField="name" out={setFilteredTags} />
            {filteredTags.map((tag) => {
                return <TagView className="mb-2" key={tag.id} {...tag} />;
            })}
        </div>
    );
};

export default Tags;
