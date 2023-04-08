import React from "react";

const Cards = () => {
    return (
        <div className={"max-w-xs rounded-lg border-1 shadow-md shadow-slate-500"}>
            <img
                src="https://howling-blog-uploads.s3.ap-southeast-1.amazonaws.com/2023/2/3/100827958_p0.jpg"
                alt=""
                className="aspect-square w-auto h-auto rounded-t-lg max-w-full"
            />
            <div className="px-2 py-2 flex flex-col">
                <span className="text-xl font-bold">Title</span>
                <span className="text-lg">Description</span>
            </div>
        </div>
    );
};

export default Cards;
