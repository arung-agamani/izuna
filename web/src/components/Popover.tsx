import React from "react";
import { Popover, PopoverButton, PopoverPanel } from "@headlessui/react";

const PopoverComponent = () => {
    return (
        <Popover className="relative">
            <PopoverButton className="px-4 py-2 bg-blue-500 text-white rounded-lg">A Button</PopoverButton>
            <PopoverPanel anchor="bottom" className="absolute z-10 mt-2">
                <div className="border-2 border-slate-800 flex flex-col bg-white">
                    <a href="#" className="px-4 py-2 text-lg no-underline hover:bg-slate-100">
                        Text 1
                    </a>
                    <a href="#" className="px-4 py-2 text-lg no-underline hover:bg-slate-100">
                        Text 2
                    </a>
                    <a href="#" className="px-4 py-2 text-lg no-underline hover:bg-slate-100">
                        Text 3
                    </a>
                </div>
            </PopoverPanel>
        </Popover>
    );
};

export default Popover;
