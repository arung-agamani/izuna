import React, { forwardRef } from "react";

interface Props {
    label: string;
    name: string;
    readOnly?: boolean;
    placeholder?: string;
    [x: string]: any;
}

const TextInput = forwardRef<HTMLInputElement, Props>(({ label, name, readOnly, placeholder, ...rest }, ref) => {
    return (
        <div className="flex flex-col my-2">
            <label htmlFor={name} className="text-2xl mb-2">
                {label}
            </label>
            <input
                type="text"
                name={name}
                id={name}
                {...rest}
                ref={ref}
                placeholder={placeholder || "Input here..."}
                readOnly={readOnly}
                className="max-w-[80%] text-inherit border border-slate-200 border-solid font-mono focus:border-slate-500 focus:border-solid py-1 px-2 pl-4 text-xl rounded-lg"
            />
        </div>
    );
});

export default TextInput;
