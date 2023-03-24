import axios from "axios";
import chalk from "chalk";
import logger from "../winston";

const fetcher = axios.create({
    baseURL: "https://api.vndb.org/kana/",
});

fetcher.interceptors.request.use((config) => {
    logger.info(`Kana: ${chalk.greenBright(config.method?.toUpperCase())} request to /${chalk.blueBright(config.url)}`);
    return config;
});

export default fetcher;
