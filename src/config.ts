export const config = {
    host: "0.0.0.0",
    port: 8000,
    botPrefix:
        process.env["NODE_ENV"] === "development"
            ? new RegExp("^cdev[,! ]", "i")
            : new RegExp("^closure[,! ]", "i"),
    ownerUsers: ["145558597424644097"],
    betaTesters: ["145558597424644097"],
};

if (process.env["NODE_ENV"] === "development") {
    config.host = "127.0.0.1";
}
