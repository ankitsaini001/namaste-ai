# Make My Marriage — Project Status

_Last updated: 12 October 2026_

A running log of what has been built. Add an entry whenever a major feature is finished (see
"How to update this file" at the end).

## At a glance

| Item              | Status                                                               |
| ----------------- | -------------------------------------------------------------------- |
| Current phase     | Phase 1 — Core (in progress)                                         |
| Latest feature    | Email-code login (AUTH-02 to AUTH-06)                                |
| Up next           | Google sign-in (AUTH-01, AUTH-07), then wedding setup (WED)          |
| Main branch       | `dev` on GitHub; login is on `feat/auth-email-code`, not yet merged  |
| Code checks       | Format, lint, typecheck, tests and build all pass                    |

## Release phases (PRD §31)

| Phase                   | Scope                                        | Status      |
| ----------------------- | -------------------------------------------- | ----------- |
| Foundations             | Monorepo scaffold, local setup, CI           | ✅ Done     |
| Public homepage         | Marketing page from the UX brief             | ✅ Done     |
| 1. Core                 | AUTH, WED, ORG, EVT, GST, INV, RSVP, EML, WA, DASH | ⏳ In progress (email-code login done) |
| 2. Guest experience     | WEB, THM, LIVE                               | Not started |
| 3. Photos and documents | GAL, UPL, QR, DOC                            | Not started |
| 4. Money and planning   | MON, VEN, TSK, SHOP                          | Not started |
| 5. Extras               | Vendor discovery, DEMO, starter checklist    | Not started |
| Pilot                   | 5–10 real weddings                           | Not started |

## Feature log

Newest first.

### 3. Email-code login (AUTH-02 to AUTH-06) — 12 October 2026

**What was built**

- Organisers sign in at `/login` with a 6-digit code sent by email: enter an email, enter the
  code (six boxes; pasting and phone autofill work), and new users give their name once. Signed-in
  users land on `/app`, a placeholder until wedding setup exists, with "Log out". `/app` sends
  anyone without a session to `/login` (`proxy.ts`). The homepage's "Log in" and "Start
  planning" buttons now work.
- API: `POST /v1/auth/email-code`, `POST /v1/auth/email-code/verify`, `POST /v1/auth/logout`,
  `GET /v1/me`, `PATCH /v1/me`, with the PRD rules: 10-minute single-use codes, the same reply for
  unknown emails, lockout after 5 wrong tries, 3 codes per email per 15 minutes, 10 code requests
  per IP per hour, 30-day sessions in an HttpOnly, Secure, SameSite=Lax cookie. Codes and session
  tokens are stored only as hashes.
- Foundations every later feature reuses: request validation with the shared zod schemas
  (`nestjs-zod`), the cross-site (`Origin`) check, MongoDB-backed rate limits, the worker's job
  queue (claim with lock, retries after 30s/2m/10m/1h, postpone, crash recovery), the
  notifications module and email delivery (Mailpit locally, Resend in production) with the daily
  allowance and 20 reserved slots, the `@mmm/email-templates` package, and the migration command
  (`pnpm db:migrate`).
- Testing: API database tests with Testcontainers (real MongoDB in Docker), and the first
  Playwright browser tests with automated accessibility checks, run in CI on pull requests.

**Decisions**

- Email code first; Google sign-in is the next small slice (it needs a Google Cloud OAuth client).
- The login-code email goes through the worker job queue, as the System Design specifies.
- `users.name` is null until AUTH-05 asks for it; login codes are kept an hour after expiry so the
  screen can say "expired". Both are recorded in `CLAUDE.md` under resolved conflicts.
- Login screens follow the brief and the Stitch Sign In design. Left out from Stitch: the
  "end-to-end encrypted" claim, the "Atelier/Concierge" wording, and the bride photo on the
  code screen. The Google button appears with AUTH-01.
- The login form is rendered on the server, so it shows before JavaScript loads.
- New git workflow: one branch per feature from `dev`, merged when done.

**Verification**

- 123 unit and database tests pass (API 71, web 34, shared 16, email templates 2), plus lint,
  typecheck and build.
- 6 Playwright tests pass at desktop and phone sizes, three runs in a row, including a simulated
  CI run where Playwright starts the API, worker and web app itself. axe finds no WCAG 2.1 AA
  violations on the login steps or `/app`.
- Tested by hand against the real services: the code email arrives in Mailpit, the code signs
  the user in, `/me` works, and logout ends the session.

**Known gaps and follow-ups**

- Not built yet: Google sign-in (AUTH-01, AUTH-07), joining a wedding as an organiser (ORG),
  account deletion and the My Account page (AUTH-08), the demo (`/demo`), and the Terms and
  Privacy pages linked from the login screen.
- Production needs a Resend account and verified sending domain, `COOKIE_DOMAIN`,
  `TRUST_PROXY`, and a real `LOGIN_CODE_SECRET`.
- Local `pnpm dev` needs the file-watcher limit raised (see README troubleshooting).
- Resend bounce and complaint webhooks and the suppression list come with EML.

**Commits:** `b19acfa` … the commit adding this entry, on `feat/auth-email-code` (10 commits).

### 2. Public homepage — 3 October 2026

**What was built**

- The public homepage at `/`, following the UX & Visual Design Brief and the Google Stitch
  desktop design: navigation, hero with an arch-framed dashboard mockup, the problem, how it
  works, six feature rows with product mockups, "Simple enough for Nani", demo banner, privacy,
  FAQ, final call to action and footer.
- Design foundations for every future screen: colour, type and shadow tokens
  (`apps/web/app/globals.css`), Fraunces and Inter fonts, and shared components (button,
  section, container, eyebrow label, card, check list, arch frame, logo).
- All homepage copy in one typed file (`apps/web/content/home.ts`), with a test that blocks
  claims the PRD rules out.
- The scaffold's API status panel moved from `/` to `/status` (not linked, hidden from search).

**Decisions**

- Headings use Fraunces (from the brief), not Newsreader (from Stitch).
- Small gold text uses a darker gold (`#7D6232`) for WCAG AA contrast; "Attending" uses green.
- Stitch wording corrected to match the PRD: no meal preferences, adult/child counts, travel,
  "full resolution" photos, SMS, home addresses or pricing; the brief's simpler footer.
- One responsive page built from the desktop design; the Stitch mobile screen was used only as
  a stacking guide.
- "Planned together, by the whole family" section removed to shorten the page.

**Verification**

- Lint, typecheck, 21 web tests and production build pass.
- Automated accessibility audit (axe-core, WCAG 2.1 AA): 0 violations at 390px and 1440px.
- Screenshots reviewed at 390px, 820px and 1440px; no horizontal scrolling.

**Known gaps and follow-ups**

- Page length is about 11 screens on desktop and 16 on a phone. Shortening options not yet
  chosen: tabbed feature showcase, swipe for the guest phones on mobile, tighter spacing,
  removing the demo banner.
- "Start planning" and "Log in" link to `/login`, the demo links to `/demo`, and About,
  Contact, Privacy and Terms are not built yet (they show the not-found page).
- No link-preview image yet (comes with the invitation card image, THM-04).
- No browser-level (Playwright) tests yet.

**Commits:** `fcf7005` … `9b3e404` on `dev` (branch `feat/homepage`).

### 1. Project scaffold — 3 October 2026

**What was built**

- Turborepo + pnpm monorepo: `apps/web` (Next.js 16), `apps/api` (NestJS 11 + Mongoose 8, with
  separate API and worker entry points), `packages/shared` (zod schemas, limits, error codes),
  `infra/` (Docker Compose).
- API: `/v1` prefix, `GET /v1/health` and `GET /v1/health/ready` (pings MongoDB; 503 when it is
  down), standard error envelope, `X-Request-Id` on every response, CORS for the web app.
- Worker process that connects to MongoDB and shuts down cleanly.
- Both apps validate their environment variables at startup and refuse to start if invalid.
- Local development: one `pnpm dev` command starts MongoDB (single-node replica set) and
  Mailpit in Docker, then all apps in watch mode.
- Tooling: TypeScript 6.0, ESLint, Prettier, Vitest, Husky + lint-staged, and a GitHub Actions
  CI workflow.
- `CLAUDE.md` (project rules and resolved document conflicts) and a README setup guide.

**Decisions**

- Node 24 LTS, pnpm 10.28.2, Vitest everywhere (no Jest), zod-only validation.
- Apps run on the developer's machine; only MongoDB and Mailpit run in Docker.
- NestJS 11 and Mongoose 8 as the design documents specify, although newer majors exist.
- `docs/` is gitignored because the GitHub repository is public (except this status file).
- Pushes go to GitHub only with the owner's permission, as ankitsaini001.

**Verification**

- All checks pass locally and from a fresh clone.
- Tested against real MongoDB in Docker: readiness returns 200 when MongoDB is up, 503 when it
  is stopped, and recovers on its own when MongoDB restarts; transactions work.

**Known gaps and follow-ups**

- The CI workflow runs on `main` and pull requests only, so pushes to `dev` don't trigger it.
- Docker needs `sg docker -c "…"` until the developer logs out and back in.
- Rotate the Google Stitch API key.

**Commits:** `fb08934` … `316c421` on `dev`.

## How to update this file

After each major feature (a PRD feature such as AUTH-02, or a complete slice):

1. Add a new entry at the top of the feature log with the date and these headings: what was
   built, decisions, verification, known gaps and follow-ups, commits.
2. Update "At a glance" and the release phases table.
3. Update "Last updated" at the top.
