import axios from "axios";
import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useParams } from "react-router-dom";
import Button from "../../../components/Button";
import TextInput from "../../../components/Input/TextInput";
import { toast } from "react-toastify";

interface Reminder {
    channelId: string;
    channelType: string;
    cronString: string;
    guildId: string;
    id: number;
    message: string;
    uid: string;
}

const emptyReminder: Reminder = {
    channelId: "",
    channelType: "",
    cronString: "",
    guildId: "",
    id: -1,
    message: "",
    uid: "",
};

const ReminderDetails = () => {
    const { id } = useParams();
    const [reminder, setReminder] = useState<Reminder>(emptyReminder);
    const [hasSet, setHasSet] = useState<boolean>(false);
    const [isEditing, setIsEditing] = useState<boolean>(false);

    const { handleSubmit, register } = useForm();

    const onSubmit = async (data: any) => {
        try {
            const res = await axios.post(`/api/closure/user/reminder`, {
                ...data,
                id: Number(id),
            });
            if (res.data.success) {
                toast.success("Reminder updated!");
            } else {
                toast.error("Reminder update failed but request succeed");
                console.error(res.data);
            }
        } catch (error) {
            toast.error("Reminder update failed.");
            console.error(error);
        }
    };

    useEffect(() => {
        (async () => {
            try {
                setHasSet(false);
                const res = await axios.get(`/api/closure/user/reminder/${id}`);
                console.log(res.data);
                setReminder(res.data.reminder);
            } catch (error) {
                console.error("Error happend");
                console.error(error);
            } finally {
                setHasSet(true);
            }
        })();
    }, []);
    if (!hasSet) return null;
    return (
        <div>
            <p className="text-2xl">Details for id {id}</p>

            {isEditing ? (
                <form onSubmit={handleSubmit(onSubmit)}>
                    <Button onClick={() => setIsEditing(false)}>Cancel</Button>
                    <Button /* onClick={() => setIsEditing(false)} */>Submit</Button>
                    <TextInput {...register("content", { value: reminder.message })} label="Content" name="content" />
                    <TextInput {...register("cron", { value: reminder.cronString })} label="Cron String" name="cronString" />
                    <Button submit>Submit</Button>
                </form>
            ) : (
                <>
                    <Button onClick={() => setIsEditing(true)}>Edit Reminder</Button>
                    <p className="text-xl">
                        Content: <br />
                        <span className="text-lg">{reminder.message}</span>
                    </p>
                    <div>
                        <p className="text-xl">Content Preview</p>
                        {reminder.message.endsWith("mp4") ? (
                            <video src={reminder.message} className="w-auto max-w-full h-auto" controls />
                        ) : reminder.message.endsWith("png") ? (
                            <img src={reminder.message} className="w-auto max-w-full h-auto"></img>
                        ) : null}
                    </div>
                    <p className="text-xl">
                        Cron String: <br />
                        <span className="text-lg">{reminder.cronString}</span>
                    </p>
                </>
            )}
        </div>
    );
};

export default ReminderDetails;
