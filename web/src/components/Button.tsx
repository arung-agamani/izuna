import React, { PropsWithChildren } from "react";

const Button: React.FC<PropsWithChildren> = ({ children }) => {
    return <div className=" bg-blue-500 font-semibold text-2xl rounded-lg py-2 px-6 max-w-xs text-white my-4 mx-2">{children}</div>;
};

export default Button;
