Sometimes all you need is a little time to relax...

# Izuna

Totally not another hobby project to explore stuffs.

This repository contains 2 main components : A web server and a Discord bot.

## Why?

I want to explore stuffs. Also there is this library called `fastify` and really caught my attention, so yeah.

Oh yeah, I made several bots before but I realized on how messy the codes were (not that the current one ain't). I want to rewrite the bot while trying to keep up with current best practices.

## Architecture(?)

Everything is composed inside `src` directory, including the bot and the web server. Basically anything that's going to be executed by default will have it's implementation lies inside `src` directory. Other things like convenience scripts would happen in `scripts` folder, if any.

Inside `src` lies the common stuff you'll see when creating web server. An `index.ts` file that will be the entrypoint, `interfaces` directory for storing types and interfaces used in the project, and probably any other additional directories if needed, such as `models` or `lib`.

The only exception is the `bot` directory which contains the entire implementation of the bot. Currently only Discord bot lies inside, but it is not impossible to expand to other platform, such as LINE. Anything regarding the bot should be only isolated to this directory.

### Stacks

-   `fastify` for web backend
-   `discord.js` for Discord bot
-   `@sapphire/framework` for bot command handler

## Usage

The application is containerized as Docker image where the definition lies in `Dockerfile` file. It only compiles everything inside `src` and spews out the output in `build` directory, then copied into the image where the "entrypoint" is `index.js` file. Simply build the image using docker and run with required environment variables. The list of environment variables will follow this section.

Running in development mode will not require Docker, but it's required to have `.env` file lies in the project root directory. Define all the required environment variables there. Start the app using the `dev` script defined in `package.json` and you're good to go.

### Environment variables.

| Variable Name       | Type   | Description                          |
| ------------------- | ------ | ------------------------------------ |
| `DISCORD_BOT_TOKEN` | string | Token used to login to Discord bot.  |
| `NHPROXY_AUTH`      | string | Auth string used for nhproxy backend |

## Contributing

Simply create an issue with features you want to contribute, and create PR to the `dev` branch. State the functionality, requirements, and why do you think your feature is cool to be added.
