import ax from "axios";

const axios = ax.create({
    // baseURL: `http://127.0.0.1:8000`,
});

axios.interceptors.response.use(
    (config) => {
        return config;
    },
    (err) => {
        if (err.response.status === 401) {
            window.location.href = "/login";
        } else {
            return Promise.reject(err);
        }
    }
);

export default axios;
