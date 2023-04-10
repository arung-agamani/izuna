import { useState, useEffect } from "react";
import axios from "./lib/axios";
import izunaPlaceholder from "../assets/izuna.jpg";
import HomePage from "../pages/Home.mdx";
import { MDXComponents } from "mdx/types";

const mdxConfig: MDXComponents = {
    h2: (props) => <p {...props} className="text-2xl font-bold" />,
    h3: (props) => <p {...props} className="text-xl font-semibold" />,
    img: (props) => <img {...props} /* className="w-auto h-auto max-h-96"  */ />,
    blockquote: (props) => <p className="px-4 py-2 rounded-md bg-slate-800 text-slate-100 text-lg">{props.children}</p>,
};

const Home = () => {
    const [apiVersion, setApiVersion] = useState("");

    useEffect(() => {
        (async () => {
            const getApiVersion = await axios.get(`/api/status`);
            setApiVersion(getApiVersion.data.version);
        })();
    }, []);
    return (
        <div className="text-center">
            <img src={izunaPlaceholder} alt="" className="max-w-xs sm:max-w-sm" />
            <div className="">
                <p>API Version is {apiVersion}</p>
            </div>
            <div className="text-left">
                <p className="text-2xl text-center">
                    Izuna Bot!
                    <br />
                    <span className="text-lg">(currently operates as Closure Bot)</span>
                </p>
                <p>
                    This website you are seeing holds the necessary information for using Izuna as your bot companion, and also contains handy web dashboard for
                    some (if not all) features it holds.
                </p>
                <HomePage components={mdxConfig} />
            </div>
        </div>
    );
};

export default Home;
