# Make My Marriage

A web app where one Indian family plans every ceremony of a wedding: ceremony-wise invitations,
per-ceremony RSVP through personal links (no guest accounts), email invitations, budget and
installments, tasks, shopping, vendors, documents, a themed wedding website and a shared photo
gallery. Tagline: _The calm behind the celebration._

## Source documents

The specs live in `docs/` as PDFs. They are **gitignored** (the GitHub repo is public), so they
exist only on the developer's machine.

| File                          | What it decides                                          |
| ----------------------------- | -------------------------------------------------------- |
| `docs/01-prd.pdf`             | Product behaviour, limits, priorities, release phases    |
| `docs/02-system-design.pdf`   | Architecture, code organisation (§8), deployment (§19)   |
| `docs/03-database-design.pdf` | Collections, fields, indexes, transactions, enums        |
| `docs/04-api-design.pdf`      | Endpoints, envelopes, error codes, rate limits           |
| `docs/05-ux-design-brief.pdf` | Look and feel                                            |

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

_To be filled in when the scaffold is complete._
