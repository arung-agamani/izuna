import axios from "axios";
import logger from "./winston";

const instance = axios.create();

instance.interceptors.request.use((config) => {
    logger.debug(`${config.method} request to ${config.url}`);
    return config;
});

export default instance;
