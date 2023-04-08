import React, { useState } from "react";
import { toast } from "react-toastify";
import Cards from "../components/Cards";
import Filterer from "../components/Filterer";
import Listbox from "../components/Listbox";
import TagView, { examples } from "../components/TagView";

const guilds = [
    {
        id: "1",
        name: "awoo",
    },
    {
        id: "2",
        name: "awii",
    },
];

const Test = () => {
    const [filtered, setFiltered] = useState(guilds);

    return (
        <div>
            <h1>Testing Components Style and Functionality Page</h1>
            <label htmlFor="">Toast</label>
            <div>
                <button
                    className="px-4 py-2 bg-red-700 text-slate-200 font-mono"
                    onClick={() => {
                        toast.error("Awoo");
                    }}
                >
                    Errorkan
                </button>
                <button
                    className="px-4 py-2 bg-blue-700 text-slate-200 font-mono"
                    onClick={() => {
                        toast.info("Awoo");
                    }}
                >
                    Infokan
                </button>
            </div>
            <label htmlFor="">Listbox</label>
            <Listbox items={guilds} onSelectionChange={() => {}} displayField="name" />
            <label htmlFor="">Filterer</label>
            <Filterer data={guilds} targetField="name" out={setFiltered} shape={guilds[0]} />
            <label htmlFor="">Filterer Result</label>
            {filtered.map((item) => (
                <p>{item["name"]}</p>
            ))}
            <label htmlFor="">Tag View</label>
            <TagView className="mb-2" {...examples[0]} />
            <TagView {...examples[1]} />
            <label htmlFor="">Two Column Container</label>
            <div className="flex w-full">
                <div className="w-full my-2 border rounded-lg shadow-md pl-4 pr-2 py-2 ">
                    <p>Example container</p>
                </div>
                <div className="w-full my-2 border rounded-lg shadow-md pl-4 pr-2 py-2 ">
                    <p>Example container</p>
                </div>
            </div>
            <label htmlFor="">Three Column Container</label>
            <div className="flex w-full">
                <div className="w-full my-2 border rounded-lg shadow-md pl-4 pr-2 py-2 ">
                    <p>Example container</p>
                </div>
                <div className="w-full my-2 border rounded-lg shadow-md pl-4 pr-2 py-2 ">
                    <p>Example container</p>
                </div>
                <div className="w-full my-2 border rounded-lg shadow-md pl-4 pr-2 py-2 ">
                    <p>Example container</p>
                </div>
            </div>
            <label htmlFor="">Cards</label>
            <Cards />
        </div>
    );
};

export default Test;
