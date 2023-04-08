import React, { PropsWithChildren } from "react";

const Container: React.FC<PropsWithChildren<{}>> = ({ children }) => {
    return <div className="flex flex-col w-full my-2 border rounded-lg shadow-md pl-4 pr-2 py-2">{children}</div>;
};

export default Container;
