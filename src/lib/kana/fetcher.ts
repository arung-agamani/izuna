import axios from "axios";

import logger from "../winston";

const fetcher = axios.create({
    baseURL: "https://api.vndb.org/kana/",
});

fetcher.interceptors.request.use((config) => {
    logger.debug(`Kana: ${config.method?.toUpperCase()} request to ${config.url}`);
    return config;
});

export default fetcher;
