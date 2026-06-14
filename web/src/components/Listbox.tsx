import React, { useState } from "react";
import { Listbox, ListboxButton, ListboxOption, ListboxOptions } from "@headlessui/react";

interface Props {
    items: any[];
    onSelectionChange: (selected: any) => void;
    displayField: string;
}

const ListboxComponent: React.FC<Props> = ({ items, onSelectionChange, displayField }) => {
    const [selectedValue, setSelectedValue] = useState(items[0]);

    if (items.length === 0) return <p>No selection item given</p>;
    return (
        <div className="w-72">
            <Listbox
                value={selectedValue}
                onChange={(selected) => {
                    setSelectedValue(selected);
                    onSelectionChange(selected);
                }}
            >
                <div className="relative">
                    <ListboxButton
                        className={`font-mono relative px-4 py-2 rounded-lg bg-green-600 text-slate-100 border-0 text-xl w-full mx-auto text-left
                hover:bg-green-500 hover:cursor-pointer
            `}
                    >
                        {selectedValue[displayField]}
                    </ListboxButton>
                    <ListboxOptions className={"font-mono absolute z-10 mt-1 list-none bg-slate-200 w-full max-w-xs rounded-md"}>
                        {items.map((item) => (
                            <ListboxOption
                                key={item["id"]}
                                value={item}
                                className="font-mono relative px-4 py-2 border-0 text-xl mx-auto text-left
                                hover:cursor-pointer data-[focus]:bg-slate-300 text-blue-800
                                mb-1 first:my-1 truncate
                            "
                            >
                                {item.name}
                            </ListboxOption>
                        ))}
                    </ListboxOptions>
                </div>
            </Listbox>
        </div>
    );
};

export default ListboxComponent;
