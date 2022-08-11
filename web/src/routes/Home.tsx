import React, { useState, useEffect } from "react";
import axios from "axios";
import izunaPlaceholder from "../assets/izuna.jpg";

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
            <img src={izunaPlaceholder} alt="" />
            <div className="card">
                <p>API Version is {apiVersion}</p>
            </div>
        </div>
    );
};

export default Home;
