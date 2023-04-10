import { atom } from "recoil";

export interface UserState {
    name: string;
    loginType: "DISCORD" | "GOOGLE" | null;
    email: string;
    dateCreated: Date;
    id: number;
    uid: string;
}

export const userAtom = atom<UserState>({
    key: "user",
    default: {
        name: "",
        loginType: null,
        email: "",
        dateCreated: new Date(),
        id: -1,
        uid: "",
    },
});
