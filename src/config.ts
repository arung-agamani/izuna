export const config = {
    host: "0.0.0.0",
    port: 8000,
    botPrefix:
        process.env["NODE_ENV"] === "development"
            ? new RegExp("^cdev[,! ]", "i")
            : new RegExp("^closure[,! ]", "i"),
};

if (process.env["NODE_ENV"] === "development") {
    config.host = "127.0.0.1";
}
