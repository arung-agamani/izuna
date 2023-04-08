import React, { useState } from "react";
import { Listbox as LB } from "@headlessui/react";

interface Props {
    items: any[];
    onSelectionChange: (selected: any) => void;
    displayField: string;
}

const Listbox: React.FC<Props> = ({ items, onSelectionChange, displayField }) => {
    const [selectedValue, setSelectedValue] = useState(items[0]);

    if (items.length === 0) return <p>No selection item given</p>;
    return (
        <div className="w-72">
            <LB
                value={selectedValue}
                onChange={(selected) => {
                    setSelectedValue(selected);
                    onSelectionChange(selected);
                }}
            >
                <div className="relative">
                    <LB.Button
                        className={`font-mono relative px-4 py-2 rounded-lg bg-green-600 text-slate-100 border-0 text-xl w-full mx-auto text-left
                hover:bg-green-500 hover:cursor-pointer
            `}
                    >
                        {selectedValue[displayField]}
                    </LB.Button>
                    <LB.Options as="div" className={"font-mono absolute mt-1 p list-none bg-slate-200 w-full max-w-xs rounded-md"}>
                        {items.map((item) => (
                            <LB.Option
                                as="div"
                                key={item["id"]}
                                value={item}
                                className={({ active }) => `font-mono relative px-4 py-2 border-0 text-xl mx-auto text-left
                                hover:cursor-pointer
                                ${active ? "bg-slate-300 text-blue-800" : "text-blue-800"}
                                mb-1 first:my-1 truncate
                            `}
                            >
                                {item.name}
                            </LB.Option>
                        ))}
                    </LB.Options>
                </div>
            </LB>
        </div>
    );
};

export default Listbox;
