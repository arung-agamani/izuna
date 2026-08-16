Sometimes all you need is a little time to relax...

# Izuna

Totally not another hobby project to explore stuffs.

This repository contains 2 main components: a Fastify web server and a Discord bot.

## Why?

I want to explore stuffs. Also there is this library called `fastify` and it really caught my attention, so yeah.

Oh yeah, I made several bots before but I realized on how messy the codes were (not that the current one ain't). I want to rewrite the bot while trying to keep up with current best practices.

## Architecture

Monorepo with two workspaces:

| Path | What |
|---|---|
| `src/` | Backend — Discord bot + Fastify API, TypeScript, layered (`routes` → `services` → `repositories` → Prisma) |
| `web/` | Frontend — React 19 + Vite 6 + Tailwind 4, built to `web/dist` and served by Fastify |
| `prisma/` | Prisma schema + migrations |
| `scripts/` | Convenience scripts |

### Stacks

- `fastify` for the web backend
- `discord.js` + `@sapphire/framework` for the bot
- `shoukaku` + Lavalink for music
- `prisma` (v7, driver adapters) + PostgreSQL for data
- `winston` for logging
- `vitest` for backend tests

## Prerequisites

- Node.js **22+**
- Yarn **v1** (classic)
- PostgreSQL (for Prisma)
- A `.env` file at the project root (see [Environment variables](#environment-variables))

## Setup

```sh
# Backend deps
yarn install

# Frontend deps
cd web && yarn install && cd ..

# Generate the Prisma client (into src/generated/, gitignored)
npx prisma generate
```

## Running in development

No Docker needed — just a `.env` at the project root.

```sh
# Everything (bot + web) with hot reload
yarn dev

# Component-specific
yarn dev:bot    # bot only (RUN_WEB=0)
yarn dev:web    # web server only (RUN_BOT=0)
yarn dev:mute   # no Lavalink/Shoukaku (MUTE=1)
```

The frontend has its own dev server (Vite, port 5173):

```sh
cd web && yarn ldev
```

## Building

```sh
# Backend: prisma generate + type-check + esbuild transpile → build/
yarn build

# Frontend: Vite build → web/dist
cd web && yarn build
```

## Tests

```sh
yarn test          # vitest (backend)
yarn test:types    # type-check the test files
yarn test:watch    # vitest watch mode
```

## Linting

```sh
yarn lint          # eslint src — errors fail, warnings pass
yarn lint:fix      # auto-fix
```

## Database migrations

```sh
npx prisma migrate dev     # create + apply a new migration (dev)
npx prisma migrate deploy  # apply pending migrations (prod)
npx prisma generate        # regenerate the Prisma client after schema changes
```

Migrations run against `DATABASE_URL`, configured in `prisma.config.ts`.

## Docker

```sh
docker build -t izuna .
docker run --env-file .env -p 8000:8000 izuna
```

The container's entrypoint runs `npx prisma migrate deploy` then starts the app. The web server listens on `0.0.0.0:8000`.

## Environment variables

| Variable | Type | Description |
|---|---|---|
| `NODE_ENV` | string | `development` or `production` |
| `DISCORD_BOT_TOKEN` | string | Discord bot token |
| `DISCORD_OAUTH_CLIENT_ID` | string | Discord OAuth client ID |
| `DISCORD_OAUTH_CLIENT_SECRET` | string | Discord OAuth client secret |
| `GOOGLE_OAUTH_CLIENT_ID` | string | Google OAuth client ID |
| `GOOGLE_OAUTH_CLIENT_SECRET` | string | Google OAuth client secret |
| `GOOGLE_CLOSURE_API_KEY` | string | Google API key (legacy closure) |
| `AUTH_SECRET` | string | JWT signing secret |
| `DATABASE_URL` | string | PostgreSQL connection URL (Prisma) |
| `RUN_BOT` | string | `1` to start the bot, `0` to skip |
| `RUN_WEB` | string | `1` to start the web server, `0` to skip |
| `MUTE` | string | `1` to disable Lavalink/Shoukaku |
| `LAVALINK_CONFIG_PATH` | string | URL to a JSON array of Lavalink nodes |
| `USE_LOCAL_LAVALINK` | string | `true` to use `localhost:2333` instead |
| `KUREYA_LAVALINK_PASSWORD` | string | Lavalink password for the kureya node |
| `NHPROXY_AUTH` | string | Auth string for the nhproxy backend |
| `S3_REGION` / `S3_BUCKET` | string | S3 region / bucket |
| `S3_CLIENT_ID` / `S3_CLIENT_SECRET` | string | S3 access key ID / secret |
| `LOKI_HOST` / `LOKI_USER` / `LOKI_PASS` | string | Optional Grafana Loki transport (opt-in) |
| `SENTRY_DNS` | string | Sentry DSN (note: misspelled `DNS`, matches deployed config) |
| `ADMIN_USERS` | string | Comma-separated Discord user IDs allowed to use `/api/izuna/admin/*` |

## Contributing

Simply create an issue with features you want to contribute, and create a PR to the `dev` branch. State the functionality, requirements, and why you think your feature is cool to be added.
