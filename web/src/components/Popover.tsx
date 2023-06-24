import React from "react";
import { Popover as Pop } from "@headlessui/react";

const Popover = () => {
    return (
        <Pop>
            {({ open }) => (
                <>
                    <Pop.Button>A Button</Pop.Button>
                    <Pop.Panel>
                        <div className="absolute border-2 border-slate-800 flex flex-col">
                            <a href="#" className="px-4 py-2 bg-white text-lg no-underline">
                                Text 1
                            </a>
                            <a href="#" className="px-4 py-2 bg-white text-lg no-underline">
                                Text 2
                            </a>
                            <a href="#" className="px-4 py-2 bg-white text-lg no-underline">
                                Text 3
                            </a>
                        </div>
                    </Pop.Panel>
                </>
            )}
        </Pop>
    );
};

export default Popover;
