# Make My Marriage — Project Status

_Last updated: 3 October 2026_

A running log of what has been built. Add an entry whenever a major feature is finished (see
"How to update this file" at the end).

## At a glance

| Item              | Status                                                               |
| ----------------- | -------------------------------------------------------------------- |
| Current phase     | Phase 1 — Core (not started; foundations and homepage done)          |
| Latest feature    | Public homepage                                                      |
| Up next           | Email-code login (AUTH-02), the first full feature slice             |
| Main branch       | `dev` (pushed to GitHub as ankitsaini001); `main` is local only      |
| Code checks       | Format, lint, typecheck, tests and build all pass                    |

## Release phases (PRD §31)

| Phase                   | Scope                                        | Status      |
| ----------------------- | -------------------------------------------- | ----------- |
| Foundations             | Monorepo scaffold, local setup, CI           | ✅ Done     |
| Public homepage         | Marketing page from the UX brief             | ✅ Done     |
| 1. Core                 | AUTH, WED, ORG, EVT, GST, INV, RSVP, EML, WA, DASH | ⏳ Next |
| 2. Guest experience     | WEB, THM, LIVE                               | Not started |
| 3. Photos and documents | GAL, UPL, QR, DOC                            | Not started |
| 4. Money and planning   | MON, VEN, TSK, SHOP                          | Not started |
| 5. Extras               | Vendor discovery, DEMO, starter checklist    | Not started |
| Pilot                   | 5–10 real weddings                           | Not started |

## Feature log

Newest first.

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
