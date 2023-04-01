import logger from "./lib/winston";
import dotenv from "dotenv";
import path from "path";

if (process.env["NODE_ENV"] === "development") {
    logger.info("Application is running in development mode");
    dotenv.config({ path: path.resolve(__dirname, "..", ".env") });
} else {
    logger.info(`Application initiated at ${new Date().toLocaleString()}`);
    logger.info("Application is running in production mode");
}
export const config = {
    host: "0.0.0.0",
    port: 8000,
    runBot: process.env["RUN_BOT"] === "1" ? true : false,
    runWeb: process.env["RUN_WEB"] === "1" ? true : false,
    botPrefix: process.env["NODE_ENV"] === "development" ? new RegExp("^cdev[,! ]", "i") : new RegExp("^closure[,! ]", "i"),
    domainPrefix: process.env["NODE_ENV"] === "development" ? `http://127.0.0.1:8000` : "https://izuna.howlingmoon.dev",
    ownerUsers: ["145558597424644097"],
    betaTesters: ["145558597424644097"],
};

console.log(process.env["RUN_BOT"] === "1");

if (process.env["NODE_ENV"] === "development") {
    config.host = "127.0.0.1";
}
