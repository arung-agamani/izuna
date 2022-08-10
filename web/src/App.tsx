import { useState, useEffect } from "react";
import reactLogo from "./assets/react.svg";
import izunaPlaceholder from "./assets/izuna.jpg";
import { config } from "./config";
import axios from "axios";
import "./App.css";

function App() {
    const [apiVersion, setApiVersion] = useState("");

    useEffect(() => {
        (async () => {
            const getApiVersion = await axios.get(
                `${config.domainPrefix}/api/status`
            );
            setApiVersion(getApiVersion.data.version);
        })();
    }, []);

    return (
        <div className="App">
            <img src={izunaPlaceholder} alt="" />
            <div className="card">
                <p>API Version is {apiVersion}</p>
            </div>
            <p className="read-the-docs">Izuna is cute</p>
        </div>
    );
}

export default App;
