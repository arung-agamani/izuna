import { Link, Outlet, useLocation } from "react-router"
import { useUser } from "../../hooks/useUser";
import { useGuilds } from "../../hooks/useGuilds";

const Main = () => {
    const { data: user } = useUser();
    const { data: guilds, isLoading: guildsLoading } = useGuilds();
    const location = useLocation();
    if (guildsLoading) return <p>Loading...</p>;
    return (
        <div>
            <p>
                Main on Izuna/Closure. You are {user?.name}. Total mutual servers with Izuna/Closure: {guilds?.guilds && guilds.guilds.length}
            </p>
            <div className="flex w-full justify-evenly mx-[-0.5rem]">
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
