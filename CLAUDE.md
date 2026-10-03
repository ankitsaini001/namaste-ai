# Make My Marriage

A web app where one Indian family plans every ceremony of a wedding: ceremony-wise invitations,
per-ceremony RSVP through personal links (no guest accounts), email invitations, budget and
installments, tasks, shopping, vendors, documents, a themed wedding website and a shared photo
gallery. Tagline: _The calm behind the celebration._

## Source documents

The specs live in `docs/` as PDFs. They are **gitignored** (the GitHub repo is public), so they
exist only on the developer's machine.

| File                          | What it decides                                        |
| ----------------------------- | ------------------------------------------------------ |
| `docs/01-prd.pdf`             | Product behaviour, limits, priorities, release phases  |
| `docs/02-system-design.pdf`   | Architecture, code organisation (§8), deployment (§19) |
| `docs/03-database-design.pdf` | Collections, fields, indexes, transactions, enums      |
| `docs/04-api-design.pdf`      | Endpoints, envelopes, error codes, rate limits         |
| `docs/05-ux-design-brief.pdf` | Look and feel                                          |

When documents disagree: the PRD wins on product behaviour; for technical detail, API Design wins
over Database Design, which wins over System Design. Known conflicts are already resolved in
[Resolved document conflicts](#resolved-document-conflicts) — follow that section, not the PDFs.

Build features one at a time, in the PRD's release order:

1. Core — AUTH, WED, ORG, EVT, GST, INV, RSVP, EML, WA, DASH
2. Guest experience — WEB, THM, LIVE
3. Photos and documents — GAL, UPL, QR, DOC
4. Money and planning — MON, VEN (my vendors), TSK, SHOP
5. Extras — vendor discovery, DEMO, starter checklist

## Stack

- Monorepo: Turborepo + pnpm workspaces, TypeScript everywhere, Node 24 LTS.
- `apps/web`: Next.js 16 (App Router, no `src/`), React 19, Tailwind CSS 4 → Vercel (`bom1`).
- `apps/api`: NestJS 11 + Mongoose 8 → one AWS EC2 server in Mumbai behind Caddy. Two entry
  points from the same code: `src/main.ts` (HTTP API) and `src/worker.ts` (background worker,
  no HTTP).
- `packages/shared` (`@mmm/shared`): zod schemas, enums, limits and error codes used by both apps.
  Built with tsup to ESM + CJS; apps import the built `dist/`.
- `packages/email-templates`: React Email templates — created with the first email (AUTH-02).
- `infra/`: local Docker Compose now; production compose, Caddyfile and media worker later.
- Database MongoDB Atlas (Mumbai); files in Cloudflare R2 via a Media Worker; email via Resend.

Use the major versions above. Upgrading a major (for example NestJS 12, Mongoose 9) is a separate,
deliberate decision.

## Architecture rules

- **Tenancy is the most important rule.** Each user belongs to exactly one wedding. Organiser
  requests never carry a wedding ID: the backend derives `weddingId` from the session, and every
  query on wedding data filters by it. A Mongoose tenant-guard plugin rejects unscoped queries;
  exemptions (`skipTenantGuard`) are rare, commented and reviewed.
- A module talks to another module only through that module's service, never its collection.
- The frontend holds no business rules; the backend checks everything.
- Slow work goes through the `jobs` collection and the worker. No Redis or other queue.
- Features never call Resend directly; they go through the notifications module (channels:
  email now, WhatsApp/SMS slots later).

## API conventions

- REST under `/v1`, JSON, camelCase, IDs as 24-character hex strings named `id`.
- Success: `{ "data": … }`; lists: `{ "data": [...], "page": { "nextCursor", "hasMore" } }`.
- Error: `{ "error": { "code", "message", "field" }, "requestId" }`. `code` comes from API Design
  §9; `message` is written for the person using the app. Every response has `X-Request-Id`.
- Cursor paging, default 50, max 100 (gallery default 60). Background work returns 202.
- Guests and expenses carry `version`; a stale edit returns 409 `VERSION_CONFLICT`.
- Validation is **zod only** (schemas in `@mmm/shared`, nestjs-zod in the API, OpenAPI generated
  from them). No class-validator.
- No secrets in URLs except guest codes. Cookies: `mmm_session`, `mmm_upload`, `mmm_oauth`.

## Data conventions

- Money: whole rupees as numbers. Moments: stored UTC, shown IST. Calendar days: `YYYY-MM-DD`,
  fields ending in `On` (`dueOn`, `paidOn`).
- Empty values are `null`, never `""`; lists default to `[]`. Enum values are lower_snake_case.
- Secrets (session tokens, login codes, invite tokens) are stored only as SHA-256 hashes.
- Indexes are defined in schemas but created by a migration step, never at app start
  (`autoIndex` is on only in local development).
- MongoDB must run as a replica set everywhere, including locally (transactions).
- Never log tokens, login codes, guest emails or phone numbers.

## Design

- The UX & Visual Design Brief is the design source of truth. The Google Stitch project
  "Make My Marriage Landing Page" (Stitch MCP server `stitch`, project `1672736047916376677`)
  is a visual reference only: never copy its HTML or its wording without checking it against
  the PRD and the brief.
- Tokens (colours, type scale, shadows) live in `apps/web/app/globals.css` (`@theme`). Fonts:
  Fraunces (headings) and Inter (body) via `next/font`.
- Champagne `#C9AE84` is for lines, outlines and decoration only. Small text and icons use
  `champagne-ink`; "Attending" uses `green-ink` on `green-tint`. Keep WCAG AA contrast, 16px+
  body text and 44px+ tap targets.
- Homepage copy lives in `apps/web/content/home.ts`; `content/home.spec.ts` blocks claims the
  PRD rules out (pricing, "free", SMS, full-resolution photos, data staying in India).
- Product mockups use the PRD's real fields and sample couple Aarav & Diya (14 Feb 2027,
  Jaipur), wrapped in `Mockup` so screen readers get one description.

## Resolved document conflicts

These decisions override the PDFs:

- Guest and gallery codes: 10 characters from the **31-character** alphabet
  `23456789ABCDEFGHJKMNPQRSTUVWXYZ` (no 0, 1, I, L, O).
- Calendar-day fields are `dueOn` (tasks, installments), never `dueDate`.
- `weddings.setupStep` is the string enum `details | events | organisers | done`.
- `emailQuota` fields are `_id` (UTC day), `sent`, `bulkSent`, `dailyLimit`, `reserved`.
- Payment methods: `upi | cash | bank_transfer | card | cheque | other`.
- Job types include `reset_demo`.
- Health: `GET /v1/health` (liveness, `{ "status": "ok" }`) and `GET /v1/health/ready`
  (also pings MongoDB; 503 `SERVICE_UNAVAILABLE` when not ready).
- Local development: web, api and worker run on the developer's machine; only MongoDB (replica
  set) and Mailpit run in Docker. The apps are containerised with the deployment work.
- Tests use **Vitest** everywhere (the API via `unplugin-swc`), with Supertest for HTTP tests,
  Testcontainers for real-database tests and Playwright for end-to-end tests. No Jest.
- Next.js 16 uses `proxy.ts` (formerly `middleware.ts`) for the login-cookie redirect.

## Git

- Commit locally on `main`, one commit per logical step, Conventional Commit messages.
- **Never push to GitHub without the owner's explicit permission.**
- `docs/` and `.env*` files (except `.env.example`) are never committed.

## Commands

Run from the repository root (Node 24, pnpm 10.28.2 via Corepack).

| Command                                      | What it does                                                      |
| -------------------------------------------- | ----------------------------------------------------------------- |
| `pnpm install`                               | Install all workspaces                                            |
| `pnpm dev`                                   | `infra:up`, then all apps in watch mode                           |
| `pnpm dev:apps`                              | All apps in watch mode, without Docker                            |
| `pnpm infra:up` / `pnpm infra:down`          | Start / stop MongoDB and Mailpit (`infra/docker-compose.dev.yml`) |
| `pnpm build`                                 | Build everything (`@mmm/shared` first)                            |
| `pnpm test` / `pnpm lint` / `pnpm typecheck` | Vitest / ESLint / TypeScript in every package                     |
| `pnpm format` / `pnpm format:check`          | Prettier write / check                                            |
| `pnpm --filter @mmm/api test`                | One package only (`@mmm/api`, `@mmm/web`, `@mmm/shared`)          |
| `pnpm --filter @mmm/api dev:worker`          | Worker alone, in watch mode                                       |

CI (`.github/workflows/ci.yml`) runs `pnpm install --frozen-lockfile`, `pnpm format:check`, then
`pnpm turbo run lint typecheck test build`. Run the same before committing a step.

## Local setup

| Service | Address                                                                              |
| ------- | ------------------------------------------------------------------------------------ |
| Web     | http://localhost:3000 (homepage), http://localhost:3000/status (API + MongoDB check) |
| API     | http://localhost:4000/v1                                                             |
| MongoDB | `mongodb://localhost:27017/makemymarriage?directConnection=true` (replica set `rs0`) |
| Mailpit | SMTP `localhost:1025`, UI http://localhost:8025                                      |

- Env files: `apps/api/.env` and `apps/web/.env.local`, copied from the `.env.example` next to
  them. Both apps validate env with zod at startup and exit with a readable message if invalid.
- `@mmm/shared` is consumed from its built `dist/`. After changing it outside `pnpm dev`, run
  `pnpm build` (Turbo builds it before dependants automatically).

## Working notes

- API tests use Vitest globals (`describe`, `it`, `vi`) because the API compiles as CommonJS;
  web and shared tests import from `vitest`. HTTP tests reuse `configureApp()` from
  `src/app.setup.ts` so they exercise the real prefix, filter, request ID and CORS.
- API HTTP tests must not need MongoDB: provide a fake `DatabaseHealthIndicator` (or other
  provider) instead of importing `AppModule`.
- Throw `AppException(status, code, message, field?, details?)` for every expected error; the
  global filter turns anything else into `INTERNAL_ERROR` without leaking details.
- `dev` (API) and `dev:worker` compile to separate folders (`dist/`, `dist-worker/`) so both can
  watch at once; production uses `dist/main.js` and `dist/worker.js`.
- TypeScript stays on 6.0.x until typescript-eslint supports newer versions.
- `turbo.json` sets `agentGuidance: false`, so Turborepo doesn't write an `AGENTS.md`.
- After removing or moving a Next.js route, delete `apps/web/.next` if `typecheck` reports a
  missing module under `.next/dev/types` (stale types from an earlier dev server).
- Tailwind: don't combine `hidden` with a component's own display class (`inline-flex`); wrap the
  component instead, or the display class may win.
