function getEnv(name: string): string {
  const val = process.env[name];
  if (val === undefined || val === null) {
    throw new Error("Missing environment variable: " + name);
  }
  return val;
}

export const env = {
  NODE_ENV: (process.env["NODE_ENV"] || "development") as "development" | "production",
  AUTH_SECRET: getEnv("AUTH_SECRET"),
  GOOGLE_OAUTH_CLIENT_ID: getEnv("GOOGLE_OAUTH_CLIENT_ID"),
  GOOGLE_OAUTH_CLIENT_SECRET: getEnv("GOOGLE_OAUTH_CLIENT_SECRET"),
  DISCORD_OAUTH_CLIENT_ID: getEnv("DISCORD_OAUTH_CLIENT_ID"),
  DISCORD_OAUTH_CLIENT_SECRET: getEnv("DISCORD_OAUTH_CLIENT_SECRET"),
  DISCORD_BOT_TOKEN: getEnv("DISCORD_BOT_TOKEN"),
  SENTRY_DNS: process.env["SENTRY_DNS"],
  RUN_BOT: process.env["RUN_BOT"] === "1",
  RUN_WEB: process.env["RUN_WEB"] === "1",
  LAVALINK_CONFIG_PATH: process.env["RUN_BOT"] === "1" ? getEnv("LAVALINK_CONFIG_PATH") : "",
};
