import React, { useState } from "react";
import Container from "./Container";

const exampleFields = {
    name: "string",
    isFilled: "boolean",
};

interface Props {
    data: any[];
    targetField: string;
    out: (output: any[]) => void;
    shape?: any;
    advancedFilter?: boolean;
}

function typeFactory(type: any) {
    switch (typeof type) {
        case "string":
            return "";
        case "boolean":
            return false;
        case "number":
            return 0;
        default:
            return "string";
    }
}

const Filterer: React.FC<Props> = ({ data, targetField, out, shape, advancedFilter = false }) => {
    if (data.length === 0) return null;
    const [fieldFilter, setFieldFilter] = useState<any>(
        Object.assign(
            {},
            ...Object.entries(shape ? shape : data[0]).map(([field, type]) => {
                const a: Record<string, any> = {};
                a[`${field}`] = typeFactory(type);
                return a;
            })
        )
    );
    const onChange = (value: string) => {
        if (value === "") {
            out(data);
            return;
        }
        const filtered = data.filter((x) => (x[targetField] as string).includes(value));
        out(filtered);
    };
    return (
        <Container>
            <input
                type="text"
                name="inputField"
                id=""
                onChange={(e) => onChange(e.target.value)}
                placeholder="Insert words to filter out here"
                className="text-inherit border border-slate-200 border-solid font-mono focus:border-slate-500 focus:border-solid py-1 px-2 pl-4 text-xl rounded-lg"
            />
            {advancedFilter && (
                <div className="flex justify-evenly mt-2">
                    {Object.entries(fieldFilter).map(([field, type]) => {
                        switch (typeof type) {
                            case "string":
                                return (
                                    <div key={field}>
                                        <label htmlFor="" className="mr-2">
                                            {field}
                                        </label>
                                        <input type={"text"} />
                                    </div>
                                );
                            case "number":
                                return (
                                    <div key={field}>
                                        <label htmlFor="" className="mr-2">
                                            {field}
                                        </label>
                                        <input type={"number"} />
                                    </div>
                                );
                            case "boolean":
                                return (
                                    <div key={field}>
                                        <label htmlFor="" className="mr-2">
                                            {field}
                                        </label>
                                        <input type={"checkbox"} />
                                    </div>
                                );
                        }
                    })}
                </div>
            )}
        </Container>
    );
};

export default Filterer;
