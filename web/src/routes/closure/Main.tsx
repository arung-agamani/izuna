import axios, { AxiosResponse } from "axios";
import React, { useEffect, useState } from "react";

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
    useEffect(() => {
        (async () => {
            const { data } = await axios.get<{}, AxiosResponse<UserData>>("/api/closure/user/me");
            setUser(data.data);
        })();
        (async () => {
            const { data } = await axios.get("/api/closure/user/reminder");
            console.log(data);
        })();
    }, []);

    return <div>Main on Closure. You are {user.name}</div>;
};

export default Main;
