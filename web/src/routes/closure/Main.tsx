import { AxiosResponse } from "axios";
import axios from "../lib/axios";
import { useEffect } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { useRecoilState } from "recoil";
import { userAtom } from "../../state/user";
import { GuildMembership, GuildsAtom } from "../../state/guilds";

interface APIMeResponse {
    data: {
        name: string;
        email: string;
        dateCreated: Date;
        id: number;
        uid: string;
    };
}

interface APIMeGuildResponse {
    count: number;
    guilds: GuildMembership[];
}

const Main = () => {
    const [user, setUser] = useRecoilState(userAtom);
    const [guilds, setGuilds] = useRecoilState(GuildsAtom);
    const location = useLocation();
    useEffect(() => {
        (async () => {
            if (user.loginType) return;
            {
                const { data } = await axios.get<{}, AxiosResponse<APIMeResponse>>("/api/closure/user/me");
                setUser({ ...data.data, loginType: "DISCORD" });
            }
            let cachedGuilds = localStorage.getItem("closure-guilds");
            if (!cachedGuilds) {
                const { data } = await axios.get<{}, AxiosResponse<APIMeGuildResponse>>("/api/closure/user/me/guildsAll", { withCredentials: true });
                localStorage.setItem("closure-guilds", JSON.stringify({ name: user.name, uid: user.uid, id: 0, guilds: data.guilds }));
                setGuilds({ name: user.name, uid: user.uid, id: 0, guilds: data.guilds });
            } else {
                setGuilds(JSON.parse(cachedGuilds));
            }
        })();
    }, []);
    if (!user.loginType) return null;
    return (
        <div>
            <p>
                Main on Izuna/Closure. You are {user.name}. Total mutual servers with Izuna/Closure: {guilds.guilds && guilds.guilds.length}
            </p>
            <div className="flex w-full justify-evenly">
                {["Reminder", "Tags", "Playlists", "Guilds"].map((x) => (
                    <Link className="no-underline w-full mx-2 text-center font-semibold" to={x.toLowerCase()} key={x}>
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
