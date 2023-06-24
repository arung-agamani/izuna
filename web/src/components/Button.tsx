import React, { PropsWithChildren, useRef } from "react";

interface Props {
    disabled?: boolean;
    onClick?: () => void;
    submit?: boolean;
}

const Button: React.FC<PropsWithChildren<Props>> = ({ children, disabled, onClick, submit }) => {
    const submitButtonRef = useRef<HTMLInputElement>(null);
    const onClickHandler = () => {
        onClick && onClick();
        if (submit && submitButtonRef.current) {
            submitButtonRef.current.click();
        }
    };
    return (
        <div
            onClick={onClickHandler}
            className={`${
                disabled ? "bg-gray-500" : "bg-blue-500"
            } hover:cursor-pointer font-semibold text-2xl rounded-lg py-2 px-6 max-w-xs text-white my-4 mx-2`}
        >
            {children}
            {submit ? <input type="submit" ref={submitButtonRef} className="hidden" /> : null}
        </div>
    );
};

export default Button;
