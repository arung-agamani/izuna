import { AxiosResponse } from "axios";
import axios from "../lib/axios";
import { useEffect } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { useRecoilState } from "recoil";
import { userAtom } from "../../state/user";

interface APIMeResponse {
    data: {
        name: string;
        email: string;
        dateCreated: Date;
        id: number;
        uid: string;
    };
}

const Main = () => {
    const [user, setUser] = useRecoilState(userAtom);
    const location = useLocation();
    useEffect(() => {
        (async () => {
            if (user.loginType) return;
            const { data } = await axios.get<{}, AxiosResponse<APIMeResponse>>("/api/closure/user/me");
            setUser({ ...data.data, loginType: "DISCORD" });
        })();
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
