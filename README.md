# Make My Marriage

_The calm behind the celebration._ A web app where an Indian family plans every ceremony of a
wedding in one place: ceremony-wise invitations and RSVPs, guests, budget, vendors, a wedding
website and a shared photo gallery.

This repository is a Turborepo + pnpm monorepo:

| Path                       | What it is                                                                                       |
| -------------------------- | ------------------------------------------------------------------------------------------------ |
| `apps/web`                 | Next.js 16 (App Router) frontend                                                                 |
| `apps/api`                 | NestJS 11 + Mongoose 8 backend: HTTP API (`src/main.ts`) and background worker (`src/worker.ts`) |
| `packages/shared`          | `@mmm/shared`: zod schemas, enums, limits and error codes used by both apps                      |
| `packages/email-templates` | `@mmm/email-templates`: email designs (React Email)                                              |
| `infra/`                   | Docker Compose for local MongoDB and Mailpit                                                     |

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
# Put a random secret in apps/api/.env:
#   LOGIN_CODE_SECRET=<output of: openssl rand -hex 32>

pnpm dev
```

`pnpm dev` starts MongoDB and Mailpit in Docker (and waits until they're healthy), then runs every
app in watch mode. Open http://localhost:3000 for the homepage. http://localhost:3000/status shows
**API ready** when the web app, the API and MongoDB are all working.

**Log in:** open http://localhost:3000/login, enter any email address and press "Email me a
code". The code arrives in Mailpit (http://localhost:8025) a moment later; no real email is sent
locally. New accounts are asked for a name once.

**Set up a wedding:** someone without a wedding lands on http://localhost:3000/setup: first the
couple, date, city and website address, then the ceremonies, then "Invite your family" (which can
be skipped). The wedding overview is at http://localhost:3000/app. To go through setup again, log
in with a new email address (each account belongs to one wedding).

**Invite an organiser:** invite another email address in setup step 3 or on
http://localhost:3000/app/organisers. The invitation arrives in Mailpit; open its "Join the
wedding" link in a private window and sign in with the invited address.

## Local services

| Service             | URL                                      | Notes                                        |
| ------------------- | ---------------------------------------- | -------------------------------------------- |
| Web app             | http://localhost:3000                    | `apps/web`                                   |
| API                 | http://localhost:4000/v1                 | `GET /v1/health`, `GET /v1/health/ready`     |
| Worker              | —                                        | No HTTP; sends emails; logs `Worker ready`   |
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
| `pnpm test`                    | Unit and database tests (Vitest; needs Docker)     |
| `pnpm test:e2e`                | Browser tests (Playwright) against the built apps  |
| `pnpm db:migrate`              | Build the API, apply migrations and sync indexes   |
| `pnpm lint`                    | ESLint in every package                            |
| `pnpm typecheck`               | TypeScript checks in every package                 |
| `pnpm format` / `format:check` | Format with Prettier / check formatting            |

To run a command in one package: `pnpm --filter @mmm/api test` (or `@mmm/web`, `@mmm/shared`,
`@mmm/email-templates`).

**Tests:**

- API database tests (`apps/api/test/*.int-spec.ts`) start a throwaway MongoDB container with
  Testcontainers, so Docker must be running. `pnpm --filter @mmm/api test:unit` skips them.
- Browser tests need MongoDB and Mailpit (`pnpm infra:up`), a build (`pnpm build`) and Chromium
  once (`pnpm --filter @mmm/web exec playwright install chromium`). They reuse servers already
  running on ports 3000 and 4000, or start them from the builds.

A pre-commit hook (Husky + lint-staged) runs ESLint `--fix` and Prettier on staged files.

## Environment variables

Both apps validate their variables at startup and refuse to start, with a message naming each
problem, if something is missing or invalid.

| App | File                  | Variable                               | Example                                                          |
| --- | --------------------- | -------------------------------------- | ---------------------------------------------------------------- |
| api | `apps/api/.env`       | `NODE_ENV`                             | `development`                                                    |
| api |                       | `PORT`                                 | `4000`                                                           |
| api |                       | `WEB_ORIGIN`                           | `http://localhost:3000` (allowed by CORS)                        |
| api |                       | `MONGODB_URI`                          | `mongodb://localhost:27017/makemymarriage?directConnection=true` |
| api |                       | `LOGIN_CODE_SECRET`                    | 32+ random characters (`openssl rand -hex 32`)                   |
| api |                       | `COOKIE_DOMAIN`                        | Unset locally; `.makemymarriage.com` in production               |
| api |                       | `COOKIE_SECURE`                        | `true` (browsers allow Secure cookies on localhost)              |
| api |                       | `TRUST_PROXY`                          | Unset locally; set behind Caddy so rate limits see real IPs      |
| api |                       | `EMAIL_TRANSPORT`                      | `smtp` (Mailpit) locally, `resend` in production                 |
| api |                       | `SMTP_HOST` / `SMTP_PORT`              | `localhost` / `1025`                                             |
| api |                       | `RESEND_API_KEY`                       | Only with `EMAIL_TRANSPORT=resend`                               |
| api |                       | `EMAIL_FROM`                           | `Make My Marriage <no-reply@localhost>`                          |
| api |                       | `EMAIL_DAILY_LIMIT` / `EMAIL_RESERVED` | `100` / `20` (Resend free plan)                                  |
| web | `apps/web/.env.local` | `API_URL`                              | `http://localhost:4000` (server-side calls)                      |
| web |                       | `NEXT_PUBLIC_API_URL`                  | `http://localhost:4000` (browser calls, inlined at build time)   |

`.env` files are gitignored; only the `.env.example` files are committed.

## Continuous integration

GitHub Actions ([.github/workflows/ci.yml](.github/workflows/ci.yml)) runs on every push to `main`
and on pull requests, in two jobs:

1. **Checks:** install, `format:check`, then lint, typecheck, test (including the database tests)
   and build.
2. **Browser tests:** starts MongoDB and Mailpit with Docker Compose, builds, migrates, and runs
   the Playwright login and setup tests. On failure, the Playwright report is attached to the run.

## Troubleshooting

- **`pnpm dev` fails at `infra:up`:** Docker isn't running, or your user can't reach it
  (`docker ps` should work without `sudo`).
- **The API exits with `MongooseServerSelectionError`:** MongoDB isn't reachable. It retries for a
  few seconds and then stops. Run `pnpm infra:up` and check `docker compose -f
infra/docker-compose.dev.yml ps`.
- **`EADDRINUSE` on 3000 or 4000:** another process is using the port. Stop it, or change `PORT`
  (and `API_URL`, `NEXT_PUBLIC_API_URL`) in the `.env` files.
- **`Unsupported engine` warning from pnpm:** you're not on Node 24. Run `nvm use`.
- **`ENOSPC: System limit for number of file watchers reached`:** watch mode needs more file
  watchers than Linux allows by default (editors use many). Raise the limit once:
  `echo fs.inotify.max_user_watches=524288 | sudo tee /etc/sysctl.d/60-inotify-watches.conf && sudo sysctl --system`.
- **No login code in Mailpit:** the worker sends emails. Check that it's running and logged
  `Worker ready (job types: send_email)`.
- **"Too many code requests" while testing locally:** limits are per IP and per email (10 code
  requests per IP an hour; a full `pnpm test:e2e` run uses 8). Clear them
  with `docker compose -f infra/docker-compose.dev.yml exec mongo mongosh makemymarriage --eval 'db.rateLimits.deleteMany({})'`.
- **Start the local database from scratch:** `docker compose -f infra/docker-compose.dev.yml down -v`
  deletes the MongoDB volume; the next `pnpm infra:up` creates a fresh replica set.
