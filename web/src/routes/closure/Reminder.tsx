import { useEffect, useState } from "react";
import { useRecoilState } from "recoil";
import { GuildsAtom } from "../../state/guilds";
import axios from "../lib/axios";
import { Link, Outlet } from "react-router-dom";

interface ReminderObject {
    id: number;
    uid: string;
    message: string;
    cronString: string;
    guildId: string;
    channelId: string;
    channelType: string;
}

const Reminder = () => {
    const [reminders, setReminders] = useState<ReminderObject[]>([]);
    const [guilds] = useRecoilState(GuildsAtom);
    console.log(guilds);
    useEffect(() => {
        (async () => {
            const { data } = await axios.get("/api/closure/user/reminder", { withCredentials: true });
            setReminders(data.data);
        })();
    }, []);

    if (reminders.length === 0) return <p>Fetching data...</p>;
    return (
        <div>
            <Outlet />
            {reminders &&
                reminders.map((reminder) => (
                    <Link to={`/closure/reminder/${reminder.id}`} key={reminder.id} className="no-underline">
                        <div className="px-4 py-2 text-slate-50 bg-slate-700 mb-2 hover:bg-slate-600 hover:cursor-pointer overflow-hidden">
                            <p className="text-lg">ID: {reminder.id}</p>
                            <p>
                                Guilds: {reminder.guildId ? reminder.guildId : "Not guild"}
                                {reminder.guildId && guilds.guilds && <span> -&gt; {guilds.guilds.find((x) => x.guildId === reminder.guildId)?.name}</span>}
                            </p>
                            <p>Channel ID: {reminder.channelId}</p>
                            <p>Channel Type: {reminder.channelType}</p>
                            <p>
                                Cron String: <code>{reminder.cronString}</code>
                            </p>
                            <p>Content: {reminder.message}</p>
                            <p>Registrar: {reminder.uid}</p>
                        </div>
                    </Link>
                ))}
        </div>
    );
};

export default Reminder;
