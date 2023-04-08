import { AxiosResponse } from "axios";
import axios from "../lib/axios";
import React, { useEffect, useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";

interface UserData {
    data: User;
}
interface User {
    name: string;
    email: string;
    dateCreated: Date;
}

const initialUser: User = {
    name: "",
    email: "",
    dateCreated: new Date(),
};

const Main = () => {
    const [user, setUser] = useState<User>(initialUser);
    const location = useLocation();
    useEffect(() => {
        (async () => {
            const { data } = await axios.get<{}, AxiosResponse<UserData>>("/api/closure/user/me");
            setUser(data.data);
        })();
        // (async () => {
        //     const { data } = await axios.get("/api/closure/user/reminder");
        //     console.log(data);
        // })();
    }, []);
    return (
        <div>
            <p>Main on closure. You are {user.name}</p>
            <div className="flex w-full justify-evenly">
                {["Reminders", "Tags", "Playlists", "Guilds"].map((x) => (
                    <Link className="no-underline w-full mx-2 text-center font-semibold" to={x.toLowerCase()}>
                        <div
                            className={`px-2 py-2 rounded-lg text-white mb-2 ${
                                location.pathname.split("/").pop() === x.toLowerCase() ? "bg-blue-600" : "bg-green-600"
                            }`}
                        >
                            {x}
                        </div>
                    </Link>
                ))}
            </div>
            <Outlet />
        </div>
    );
};

export default Main;
