import { useQuery } from "@tanstack/react-query";
import api from "../routes/lib/api";

export interface UserState {
    name: string;
    loginType: "DISCORD" | "GOOGLE" | null;
    email: string;
    dateCreated: Date;
    id: number;
    uid: string;
}

interface UserResponse {
    data: {
        name: string;
        email: string;
        dateCreated: Date;
        id: number;
        uid: string;
    };
}

const emptyUser: UserState = {
    name: "",
    loginType: null,
    email: "",
    dateCreated: new Date(),
    id: -1,
    uid: "",
};

export function useUser() {
    return useQuery<UserState>({
        queryKey: ["user"],
        queryFn: async () => {
            await api.post("api/auth/refresh").json();
            const data = await api.get("api/closure/user/me").json<UserResponse>();
            return { ...data.data, loginType: "DISCORD" satisfies UserState["loginType"] };
        },
        staleTime: 55 * 60 * 1000,
        refetchInterval: 55 * 60 * 1000,
        retry: false,
        refetchOnMount: false,
        placeholderData: emptyUser,
    });
}
