import { useState, useEffect } from "react";
import api from "./lib/api";
import izunaPlaceholder from "../assets/izuna.jpg";
import HomePage from "../pages/Home.mdx";
import { typographyComponents } from "../components/Typography";

interface StatusResponse {
    version: string;
}
    
const Home = () => {
    const [apiVersion, setApiVersion] = useState("");

    useEffect(() => {
        (async () => {
            const data = await api.get("api/status").json<StatusResponse>();
            setApiVersion(data.version);
        })();
    }, []);
    return (
        <div className="text-center">
            <img src={izunaPlaceholder} alt="" className="max-w-xs sm:max-w-sm mx-auto" />
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
                <HomePage components={typographyComponents} />
            </div>
        </div>
    );
};

export default Home;
