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
            const currentLocation = window.location.href;
            const urlEncoded = encodeURIComponent(currentLocation);
            const b64encoded = window.btoa(urlEncoded);
            window.location.href = `/login?redirect=${b64encoded}`;
        } else {
            return Promise.reject(err);
        }
    }
);

export default axios;
