# Make My Marriage

_The calm behind the celebration._ A web app where an Indian family plans every ceremony of a
wedding in one place: ceremony-wise invitations and RSVPs, guests, budget, vendors, a wedding
website and a shared photo gallery.

This repository is a Turborepo + pnpm monorepo:

| Path              | What it is                                                                                       |
| ----------------- | ------------------------------------------------------------------------------------------------ |
| `apps/web`        | Next.js 16 (App Router) frontend                                                                 |
| `apps/api`        | NestJS 11 + Mongoose 8 backend: HTTP API (`src/main.ts`) and background worker (`src/worker.ts`) |
| `packages/shared` | `@mmm/shared`: zod schemas, enums, limits and error codes used by both apps                      |
| `infra/`          | Docker Compose for local MongoDB and Mailpit                                                     |

Project conventions and architecture rules are in [CLAUDE.md](CLAUDE.md).

## Prerequisites

- **Node.js 24 LTS.** With nvm: `nvm install && nvm use` (reads `.nvmrc`).
- **pnpm 10.28.2** through Corepack: `corepack enable` (the version comes from `package.json`).
- **Docker** with the Compose plugin (`docker compose version`). Used only for MongoDB and Mailpit;
  the apps run directly on your machine.

## Setup

```bash
git clone https://github.com/ankitsaini001/namaste-ai.git
cd namaste-ai
pnpm install

cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local

pnpm dev
```

`pnpm dev` starts MongoDB and Mailpit in Docker (and waits until they're healthy), then runs every
app in watch mode. Open http://localhost:3000. The home page shows **API ready** when the web app,
the API and MongoDB are all working.

## Local services

| Service             | URL                                      | Notes                                        |
| ------------------- | ---------------------------------------- | -------------------------------------------- |
| Web app             | http://localhost:3000                    | `apps/web`                                   |
| API                 | http://localhost:4000/v1                 | `GET /v1/health`, `GET /v1/health/ready`     |
| Worker              | —                                        | No HTTP; logs `Worker ready` when connected  |
| MongoDB             | `mongodb://localhost:27017`              | Single-node replica set `rs0` (transactions) |
| Mailpit (SMTP / UI) | `localhost:1025` / http://localhost:8025 | Catches emails sent in development           |

## Commands

Run from the repository root.

| Command                        | What it does                                       |
| ------------------------------ | -------------------------------------------------- |
| `pnpm dev`                     | Start Docker services, then all apps in watch mode |
| `pnpm dev:apps`                | Start all apps without touching Docker             |
| `pnpm infra:up` / `infra:down` | Start / stop MongoDB and Mailpit                   |
| `pnpm build`                   | Build every package                                |
| `pnpm test`                    | Run all tests (Vitest)                             |
| `pnpm lint`                    | ESLint in every package                            |
| `pnpm typecheck`               | TypeScript checks in every package                 |
| `pnpm format` / `format:check` | Format with Prettier / check formatting            |

To run a command in one package: `pnpm --filter @mmm/api test` (or `@mmm/web`, `@mmm/shared`).

A pre-commit hook (Husky + lint-staged) runs ESLint `--fix` and Prettier on staged files.

## Environment variables

Both apps validate their variables at startup and refuse to start, with a message naming each
problem, if something is missing or invalid.

| App | File                  | Variable              | Example                                                          |
| --- | --------------------- | --------------------- | ---------------------------------------------------------------- |
| api | `apps/api/.env`       | `NODE_ENV`            | `development`                                                    |
| api |                       | `PORT`                | `4000`                                                           |
| api |                       | `WEB_ORIGIN`          | `http://localhost:3000` (allowed by CORS)                        |
| api |                       | `MONGODB_URI`         | `mongodb://localhost:27017/makemymarriage?directConnection=true` |
| web | `apps/web/.env.local` | `API_URL`             | `http://localhost:4000` (server-side calls)                      |
| web |                       | `NEXT_PUBLIC_API_URL` | `http://localhost:4000` (browser calls, inlined at build time)   |

`.env` files are gitignored; only the `.env.example` files are committed.

## Continuous integration

GitHub Actions ([.github/workflows/ci.yml](.github/workflows/ci.yml)) runs on every push to `main`
and on pull requests: install, `format:check`, then lint, typecheck, test and build.

## Troubleshooting

- **`pnpm dev` fails at `infra:up`:** Docker isn't running, or your user can't reach it
  (`docker ps` should work without `sudo`).
- **The API exits with `MongooseServerSelectionError`:** MongoDB isn't reachable. It retries for a
  few seconds and then stops. Run `pnpm infra:up` and check `docker compose -f
infra/docker-compose.dev.yml ps`.
- **`EADDRINUSE` on 3000 or 4000:** another process is using the port. Stop it, or change `PORT`
  (and `API_URL`, `NEXT_PUBLIC_API_URL`) in the `.env` files.
- **`Unsupported engine` warning from pnpm:** you're not on Node 24. Run `nvm use`.
- **Start the local database from scratch:** `docker compose -f infra/docker-compose.dev.yml down -v`
  deletes the MongoDB volume; the next `pnpm infra:up` creates a fresh replica set.
