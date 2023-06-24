import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useParams } from "react-router-dom";
import cronstrue from "cronstrue";
// import cronparser from "cron-parser"
import cronvalidate from "cron-validate";
import { Cron } from "react-js-cron";
import "react-js-cron/dist/styles.css";

import axios from "../../lib/axios";
import Button from "../../../components/Button";
import TextInput from "../../../components/Input/TextInput";
import { toast } from "react-toastify";
import TextAreaInput from "../../../components/Input/TextAreaInput";

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
    const [cron, setCron] = useState<string>(reminder.cronString);

    const { handleSubmit, register, watch, getValues, setValue } = useForm();

    const onSubmit = async (data: any) => {
        try {
            if (!cronvalidate(getValues("cron")).isValid()) {
                toast.error("Invalid cron string. Please make it correct smh");
                return;
            }
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
                    <TextAreaInput {...register("content", { value: reminder.message })} label="Content" />
                    <Cron
                        value={cron}
                        setValue={(val: string) => {
                            setValue("cron", val);
                            setCron(val);
                        }}
                    />
                    <TextInput {...register("cron", { value: reminder.cronString })} label="Cron String" />
                    <p>{cronvalidate(watch("cron")).isValid() ? "Valid cron string" : "Not a valid cron string"}</p>
                    <Button submit>Submit</Button>
                </form>
            ) : (
                <>
                    <Button onClick={() => setIsEditing(true)}>Edit Reminder</Button>
                    <p className="text-xl">Content (Raw)</p>
                    <div className="text-lg bg-white px-4 py-2 w-full whitespace-pre-wrap">
                        <span>{reminder.message}</span>
                    </div>
                    <div>
                        <p className="text-xl">Content Preview</p>
                        {reminder.message.endsWith("mp4") ? (
                            <video src={reminder.message} className="w-auto max-w-full h-auto" controls />
                        ) : new RegExp("[png|jpg|jpeg|gif]$").test(reminder.message) ? (
                            <img src={reminder.message} className="w-auto max-w-full h-auto"></img>
                        ) : (
                            <div className="text-lg bg-white px-4 py-2 w-full whitespace-pre-wrap">
                                <span>{reminder.message}</span>
                            </div>
                        )}
                    </div>
                    <p className="text-xl">Cron String</p>
                    <div className="text-lg bg-white px-4 py-2 w-full">
                        <span className="text-lg">{reminder.cronString}</span>
                        <br />
                        <span className="text-lg">It means: {cronstrue.toString(reminder.cronString)}</span>
                    </div>
                </>
            )}
        </div>
    );
};

export default ReminderDetails;
