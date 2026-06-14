import ky from "ky";

const api = ky.create({
    prefixUrl: "/",
    credentials: "include",
});

export default api;
