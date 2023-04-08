import React, { useState } from "react";
import axios from "../routes/lib/axios";

export interface TagFields {
    id: number;
    userId: string;
    guildId: string;
    name: string;
    dateCreated: string;
    message: string;
    isMedia: boolean;
    isGuild: boolean;
}

interface Props extends TagFields {
    className?: string;
    deleteHandler?: (id: string) => void;
}

export const examples: TagFields[] = [
    {
        id: 1,
        userId: "1",
        guildId: "a",
        name: "awoo",
        dateCreated: "2023-04-05T23:34:14.737Z",
        message: "aaaaa",
        isMedia: false,
        isGuild: false,
    },
    {
        id: 2,
        userId: "1",
        guildId: "b",
        name: "uwu",
        dateCreated: "2023-04-05T23:34:14.737Z",
        message: "https://howling-blog-uploads.s3.ap-southeast-1.amazonaws.com/2023/2/3/100827958_p0.jpg",
        isMedia: true,
        isGuild: true,
    },
];

const TagView: React.FC<Props> = (props) => {
    const [open, setOpen] = useState<boolean>(false);

    const delHandler = async () => {
        try {
            if (props.isGuild) {
                await axios.delete(`/api/closure/tags/me/guilds/${props.guildId}/${props.id}`, { withCredentials: true });
            } else {
                await axios.delete(`/api/closure/tags/me/${props.id}`, { withCredentials: true });
            }
            alert(`Tag "${props.name} deleted!"`);
        } catch (error) {
            alert(`Error when deleting tag "${props.name}"`);
            console.error((error as any).response.data.message);
        }
    };
    return (
        <div className={props.className || ""}>
            <div className={`px-4 py-4 bg-gray-700 text-slate-200 text-left flex flex-col`}>
                <p className="text-xl my-0">
                    Name: <span>{props.name}</span>
                </p>
                <p className="text-lg my-0">
                    Type: <span>{props.isMedia ? "Media" : "Simple Message"}</span>
                </p>
                <div className="text-md">
                    <p className="inline">
                        ID: <span>{props.id}</span> U: <span>{props.userId}</span> G: <span>{props.guildId}</span>
                    </p>
                </div>
                <hr className="w-full" />
                <div className="border-slate-100 my-0">
                    <p className="text-lg mb-2 my-0 hover:cursor-pointer" onClick={() => setOpen(!open)}>
                        &gt; Content
                    </p>

                    {open && (
                        <div className="bg-white px-2 py-2 rounded-lg shadow-inner text-black block">
                            {props.isMedia ? (
                                props.message.endsWith("mp4") ? (
                                    <video src={props.message} className="w-auto max-w-full h-auto" controls />
                                ) : (
                                    <img src={props.message} className="w-auto max-w-full h-auto"></img>
                                )
                            ) : (
                                <p>{props.message}</p>
                            )}
                        </div>
                    )}
                </div>

                <div>
                    <button onClick={() => delHandler()} className="px-4 py-2 bg-red-700 text-slate-200 font-mono">
                        Delete
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TagView;
