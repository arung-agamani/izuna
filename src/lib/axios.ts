import axios from "axios";
import chalk from "chalk";
import logger from "./winston";

const instance = axios.create();

instance.interceptors.request.use((config) => {
    console.log(`${chalk.green(config.method)} request to ${chalk.greenBright(config.url)}`);
    // logger.info(`${config.method} request to ${config.url}`);
    return config;
});

export default instance;
