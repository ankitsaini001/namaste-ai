# Make My Marriage — Project Status

_Last updated: 17 October 2026_

A running log of what has been built. Add an entry whenever a major feature is finished (see
"How to update this file" at the end).

## At a glance

| Item              | Status                                                               |
| ----------------- | -------------------------------------------------------------------- |
| Current phase     | Phase 1 — Core (in progress)                                         |
| Latest feature    | Wedding setup and overview (WED-01 to WED-06, WED-09, WED-10; DASH-01, DASH-03, DASH-06) |
| Up next           | Organisers (ORG), then ceremonies in full (EVT); Google sign-in (AUTH-01) when the OAuth client exists |
| Main branch       | `dev` on GitHub, with login and wedding setup merged                  |
| Code checks       | Format, lint, typecheck, tests and build all pass                    |

## Release phases (PRD §31)

| Phase                   | Scope                                        | Status      |
| ----------------------- | -------------------------------------------- | ----------- |
| Foundations             | Monorepo scaffold, local setup, CI           | ✅ Done     |
| Public homepage         | Marketing page from the UX brief             | ✅ Done     |
| 1. Core                 | AUTH, WED, ORG, EVT, GST, INV, RSVP, EML, WA, DASH | ⏳ In progress (email-code login, wedding setup, first overview done) |
| 2. Guest experience     | WEB, THM, LIVE                               | Not started |
| 3. Photos and documents | GAL, UPL, QR, DOC                            | Not started |
| 4. Money and planning   | MON, VEN, TSK, SHOP                          | Not started |
| 5. Extras               | Vendor discovery, DEMO, starter checklist    | Not started |
| Pilot                   | 5–10 real weddings                           | Not started |

## Feature log

Newest first.

### 4. Wedding setup and overview (WED, first part of DASH) — 17 October 2026

**What was built**

- Someone signed in without a wedding goes to `/setup`, in two steps:
  1. **Your wedding:** bride, groom, title (fills in as "Princi & Akshay" until edited), wedding
     date (today to 3 years ahead), city, an optional description, and the website address
     (`makemymarriage.com/w/…`, suggested from the names, checked as you type).
  2. **Your ceremonies:** presets (Engagement, Roka, Mehendi, Haldi, Sangeet, Cocktail, Wedding,
     Reception) with typical start times, plus custom ceremonies. Each has a name, date, start time
     in IST and a "Show on wedding website" switch. 1 to 20 ceremonies.
- What's typed is kept in the browser until the wedding is created, so a refresh or a closed tab
  returns to the same step (WED-10). The draft belongs to the signed-in user.
- Creating the wedding makes, in one transaction: the wedding with its defaults (unpublished
  Classic Indian website, default invitation design, empty budget, gallery code, reply-to email,
  WhatsApp message), the creator's Admin membership, the ceremonies, and one album per ceremony
  plus "General" (WED-02, WED-06).
- `/app` is now the wedding overview: a welcome card with the date, city and days to go (DASH-01),
  "Getting ready · 1 of 6 done" with the later steps marked "Coming soon" (DASH-03), and upcoming
  ceremonies with Private and Live stream badges (DASH-06). A signed-in header shows the name, role
  and "Log out".
- API: `POST /v1/wedding`, `GET /v1/wedding`, `GET /v1/wedding/slug-available`, `GET /v1/events`;
  `/v1/me` now includes the wedding and role.
- Foundations for every later feature: the tenant guard (a query on wedding data without
  `weddingId` is rejected), the wedding membership on every session, the `WeddingMemberGuard`
  (403 `NO_WEDDING`), IST date helpers in `@mmm/shared`, and the 10-character guest/gallery code
  generator.

**Decisions**

- Two setup steps for now; "Invite your family" (WED-01's third step) comes with ORG.
- The wedding is created at the end of step 2, with its ceremonies, in one request, so there is
  never a half-created wedding; `setupStep` is `done` from the start.
- No emoji in the default title or WhatsApp message ("Princi & Akshay", not ❤️).
- Ceremonies in setup ask only for name, date, start time and the website switch; venues, dress
  code and the rest come with EVT.
- One wedding per user is enforced by a unique index as well as a check, so two tabs creating at
  once can't make two weddings. The same goes for a website address taken at the same moment.
- All of these are recorded in `CLAUDE.md` under resolved conflicts.

**Verification**

- 194 unit and database tests pass (API 100, web 46, shared 46, email templates 2), plus format,
  lint, typecheck and build. The database tests cover creation and defaults, rollback when a step
  fails, one wedding per user and unique addresses under concurrency, validation messages, and that
  one wedding's organisers can't see another's data.
- 8 Playwright tests pass at desktop and phone sizes, including the full setup: field errors, the
  reserved and available address messages, presets and a custom private ceremony, the draft
  surviving a refresh, the overview, and `/setup` sending a finished user to `/app`. axe finds no
  WCAG 2.1 AA violations on either step or the overview.
- Screenshots reviewed at 390px and 1440px; no horizontal scrolling. This led to clearer messages
  for empty fields ("Enter the city.", "Choose a website address.") and wider date fields on
  phones.
- Manual QA on 17 October: about 70 checks across login, both setup steps, the overview, two tabs,
  a shared computer, a browser in another time zone, a dropped connection, a server error, and
  direct API calls. Fixed as a result:
  - Each person using a browser now has their own setup draft; before, opening setup replaced
    another person's draft.
  - After a wrong login code, the cursor goes back to the first box.
  - The API refuses to create a wedding for a user who hasn't given their name.
  - When the suggested website address is taken, setup suggests the next one with the wedding
    year ("princi-akshay-2027"); addresses can't start or end with a hyphen.
  - A setup tab left open notices a wedding created in another tab; a taken address found at
    "Create" puts the cursor in the address field; the overview's tab title; a readable message
    for an unknown ceremony type; the Next.js smooth-scroll warning.

**Known gaps and follow-ups**

- Not built yet: inviting organisers (ORG), editing the wedding afterwards (WED-07, WED-08), the
  cover image, and full ceremony details (EVT). The overview's other cards (guests, RSVPs, budget,
  tasks) come with their features.
- The browser tests were run locally against the dev servers; CI runs them against production
  builds on pull requests.
- Local test runs share the per-IP login-code limit (10 an hour; a full browser run uses 6).
- Open product questions from QA: preset ceremonies all start on the wedding day (Sangeet and
  Wedding both default to 7 pm that day), and tapping a preset's chip removes its ceremony even
  after it was renamed, without an undo.
- Still open from before: Google sign-in (AUTH-01, AUTH-07), production email settings.

**Commits:** `415d7cd` … the commit marking this entry merged, merged into `dev` (branch
`feat/wedding-setup`, 13 commits).

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

**Commits:** `b19acfa` … `fb4971c`, merged into `dev` (branch `feat/auth-email-code`, 10 commits).

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
