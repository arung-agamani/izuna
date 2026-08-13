import { useQuery } from "@tanstack/react-query";
import api from "../routes/lib/api";

export interface UserState {
    name: string;
    loginType: "DISCORD" | "GOOGLE" | null;
    email: string;
    createdAt: string;
    id: number;
    uid: string;
}

interface UserResponse {
    data: {
        name: string;
        email: string;
        createdAt: string;
        id: number;
        uid: string;
    };
}

export function useUser() {
    return useQuery<UserState>({
        queryKey: ["user"],
        queryFn: async () => {
            // Refresh token first (ignores failure — unauthenticated users won't have a token to refresh)
            await api.post("api/izuna/auth/refresh").catch(() => {});
            // Get user profile — this is the actual auth gate
            const data = await api.get("api/izuna/auth/me").json<UserResponse>();
            return { ...data.data, loginType: "DISCORD" satisfies UserState["loginType"] };
        },
        staleTime: 5 * 60 * 1000, // 5 min — shorter so login state propagates faster
        retry: false,
    });
}
