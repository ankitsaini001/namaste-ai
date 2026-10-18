# Make My Marriage — Project Status

_Last updated: 18 October 2026_

A running log of what has been built. Add an entry whenever a major feature is finished (see
"How to update this file" at the end).

## At a glance

| Item              | Status                                                               |
| ----------------- | -------------------------------------------------------------------- |
| Current phase     | Phase 1 — Core (in progress)                                         |
| Latest feature    | Ceremonies (EVT-01 to EVT-08) and change tracking                    |
| Up next           | Guests (GST), then invitations (INV) and RSVP; Google sign-in (AUTH-01) when the OAuth client exists |
| Main branch       | `dev` on GitHub (up to wedding details); ceremonies is on `feat/ceremonies`, not yet merged |
| Code checks       | Format, lint, typecheck, tests and build all pass                    |

## Release phases (PRD §31)

| Phase                   | Scope                                        | Status      |
| ----------------------- | -------------------------------------------- | ----------- |
| Foundations             | Monorepo scaffold, local setup, CI           | ✅ Done     |
| Public homepage         | Marketing page from the UX brief             | ✅ Done     |
| 1. Core                 | AUTH, WED, ORG, EVT, GST, INV, RSVP, EML, WA, DASH | ⏳ In progress (email-code login, wedding setup and editing, organisers, ceremonies, first overview done) |
| 2. Guest experience     | WEB, THM, LIVE                               | Not started |
| 3. Photos and documents | GAL, UPL, QR, DOC                            | Not started |
| 4. Money and planning   | MON, VEN, TSK, SHOP                          | Not started |
| 5. Extras               | Vendor discovery, DEMO, starter checklist    | Not started |
| Pilot                   | 5–10 real weddings                           | Not started |

## Feature log

Newest first.

### 7. Ceremonies (EVT-01 to EVT-08) and change tracking — 18 October 2026

**What was built**

- A Ceremonies page (`/app/ceremonies`), in the navigation for every organiser:
  - **List:** every ceremony by date and time, with its times, venue, dress code, and Private,
    Live stream and Done badges. It shows "5 of 20".
  - **Add** (`/new`): choose a preset or "Something else", and its usual day and time are filled
    in. Then the details: end time, venue, address, Google Maps link (with "Open in Google Maps"),
    dress code, a description for guests, a YouTube Live link, and "Show on wedding website".
  - **Edit:** every detail. "Save changes" sends only what changed, and "Undo changes" puts it
    back. An end time earlier than the start counts as the next morning ("7:00 pm – 1:00 am
    (next day)").
  - **Delete:** first says what it affects ("Its photo album will be deleted. Nothing else is
    linked to it yet."; later features add their counts). A wedding keeps at least one ceremony.
- Every new ceremony gets its own photo album, which follows its name; deleting the ceremony
  deletes the album. At most 20 ceremonies.
- The overview's ceremonies link to their pages, with an "All ceremonies" link.
- Setup step 2, as decided: Mehendi, Haldi, Sangeet and Cocktail start the day before the
  wedding, Reception the day after, Engagement and Roka with an empty date to fill in. A renamed
  ceremony is no longer tied to its chip, so a second Mehendi is one tap.
- Change tracking, as decided: small grey lines show who added and last changed things, with the
  date and time in IST:
  - each ceremony (card and page)
  - Wedding details in Settings
  - organisers ("Joined … · invited by …", "Made Admin by …")
  - invitations ("Sent … by …")
- API: `POST /v1/events`, `GET /v1/events/:id` (`?include=impact`), `PATCH` and `DELETE
  /v1/events/:id`, for Admins and Managers; `added` and `lastChanged` on weddings, ceremonies and
  organisers; `sentByName` on invitations.
- The API's login-code limit per IP can be set (`EMAIL_CODE_IP_LIMIT`, default 10), so the browser
  tests' own API isn't blocked as tests are added.

**Decisions**

- Only a Google Maps link on the form; the map location for the future embedded map comes from the
  venue and address.
- At least one ceremony always (new error code `LAST_EVENT`), even when two are deleted at once.
- A ceremony's album keeps its name; the type is fixed after creation.
- Change tracking shows the latest change only, not a history, and every later feature follows
  the same rule. It isn't in the documents; it's recorded in `CLAUDE.md`.
- Left for later: cover images (uploads), "invite all existing guests" when adding (Guests), and a
  map preview on the organiser's screen (website, needs a Google Maps key).

**Verification**

- 271 unit and database tests pass (API 132, web 52, shared 83, email templates 4), plus format,
  lint, typecheck and build. The new database tests cover adding with an album, the order, partial
  edits by a Manager with "Last changed by", the end-time rule, deleting and the last-ceremony rule
  (also with two deletions at once), the 20 limit and tenancy, plus who invited organisers,
  changed their role and resent an invitation.
- 10 Playwright tests pass at desktop and phone sizes. The new one adds a Sangeet (checking its
  default day and time, the next-morning end, and a bad maps link), renames it, makes it private,
  deletes it after the confirmation, and checks the last ceremony can't be deleted. axe finds no
  WCAG 2.1 AA violations on the list, add and edit pages or the confirmation. The setup test checks
  that Mehendi starts the day before.
- Screenshots reviewed at 390px and 1440px, with no sideways scrolling.
- Manual QA on 18 October with an Admin and a Manager:
  - a Manager's edit and its change line
  - equal start and end times, and a Vimeo link
  - Undo
  - the album rename
  - a missing or mistyped ceremony address
  - Keep on the delete confirmation
  - the Organisers change lines
  - the 20-ceremony limit

  Fixed from it: focus now moves to "Delete ceremony" once the impact has loaded, and a mistyped
  address says "Ceremony not found".

**Known gaps and follow-ups**

- Deleting a ceremony will also remove invitations, unlink tasks, shopping, expenses and vendors,
  and move photos to "General" as those features arrive; the confirmation already has room for it.
- Not built: cover images, "invite all existing guests" when adding (with GST), live-stream
  display (LIVE, Phase 2), and the embedded map (WEB).
- Two people editing the same ceremony at once: the later save wins (the API Design gives version
  checks only to guests and expenses).

**Commits:** `57f17c1` … the commit adding this entry, on `feat/ceremonies` (4 commits).

### 6. Wedding details in Settings (WED-07, WED-08, SET-01) — 18 October 2026

**What was built**

- A Settings page (`/app/settings`), in the navigation for Admins only, with "Wedding details":
  the bride's and groom's names, title, date, city, description and website address, as in setup
  step 1.
  - The form starts with the current details. "Save changes" stays off until something changes,
    and "Undo changes" puts everything back.
  - Each field is checked like setup, next to the field. The website address has the same live
    check, says "This is your current address." for the wedding's own, and is read-only with an
    explanation once the website has been published (WED-08).
  - After saving, the sidebar and overview show the new title and date straight away.
- Managers who open Settings are told only Admins can change it; the API refuses them too.
- API: `PATCH /v1/wedding` (Admins): only the fields sent change; a changed date must be today to
  3 years ahead, and moves the upload closing date with it; the address must be free
  (`SLUG_TAKEN`) and can't change once published (`SLUG_LOCKED`).
- The website's main heading follows the couple's names until someone edits it (website editor).
- Build: the web build now waits for the web typecheck (`apps/web/turbo.json`). Run together,
  `next build` could delete the route types `next typegen` had just written, failing the check now
  and then.

**Decisions**

- A small feature of its own rather than part of Organisers or Ceremonies.
- A wedding that has already happened keeps its date while other details change; a new date must
  be today to 3 years ahead.
- The upload closing date moves with the wedding date until SET-04 lets Admins choose it.
- Only the details part of Settings now; the other settings arrive with their features (RSVP
  deadline with RSVP, WhatsApp message with WA, uploads and gallery link with GAL/UPL, groups with
  GST, the cover image with uploads). Deleting the wedding (SET-06) is still to do.

**Verification**

- 241 unit and database tests pass (API 123, web 51, shared 63, email templates 4), plus format,
  lint, typecheck and build. The 6 new database tests cover partial changes, the date rules and
  upload date, the heading, the address (own, taken, reserved, locked) and Admin-only access.
- 8 Playwright tests pass at desktop and phone sizes; the setup test now also edits the title and
  city in Settings, checks the overview, and checks that a Manager has no Settings. axe finds no
  WCAG 2.1 AA violations on the Settings page.
- Manual QA on 18 October:
  - errors on every field, with the cursor on the first
  - Undo
  - a taken address while typing, and one taken at the moment of saving
  - a good change of title, date, description and address, kept after a reload
  - a past wedding keeping its date
  - a published website's locked address
  - the phone layout (no sideways scrolling)

**Known gaps and follow-ups**

- Not built yet: deleting the wedding (SET-06), the cover image, guest groups and the other
  settings above.
- Someone with Settings open in another tab sees changes after a reload.

**Commits:** `6c03819` … the commit marking this entry merged, merged into `dev` (branch
`feat/wedding-details`, 6 commits).

### 5. Organisers (ORG-01 to ORG-10) — 18 October 2026

**What was built**

- Setup step 3, "Invite your family": after the wedding is created, the Admin can invite people
  by name, email and role, or skip. Setup resumes there if interrupted (WED-01, WED-10).
- The Organisers page (`/app/organisers`):
  - Admins invite someone, see organisers and pending invitations, resend or cancel an
    invitation, change roles, and remove people (with a confirmation step).
  - Managers see who's helping and can leave the wedding.
  - It shows how many of the 20 places are used; expired invitations are marked and can be resent.
- The invitee's side: an email with a "Join the wedding" link that works for 7 days. The join page
  (`/join/…`) shows "Asha has invited you to help plan Asha & Karan as a Manager. Please sign in with
  q•••@example.com." above the usual email-code sign-in, fills in the invited name for the invited
  email, and joins right after. Someone already signed in joins straight away.
- Clear messages when a link was replaced, expired, cancelled or already used; when someone signs
  in with a different email ("Log out and sign in again" stays on the page); and when they already
  plan another wedding.
- The rules: a wedding always keeps an Admin (even when two Admins step down at the same moment);
  removing someone ends their sessions on every device; only Managers can leave; at most 20
  organisers, counting invitations that can still be accepted.
- The app's navigation from the UX brief: a sand sidebar on desktop (wedding card, sections, the
  user and "Log out") and a bottom tab bar on phones. It lists only the sections that exist:
  Dashboard and Organisers.
- The overview counts "Invite your family" as done once someone is invited, with a "Start" link
  until then.
- API: `GET /v1/organisers`, `POST /v1/organisers/invites`, `POST /v1/organisers/invites/:id/resend`,
  `DELETE /v1/organisers/invites/:id`, `PATCH` and `DELETE /v1/organisers/:userId`,
  `POST /v1/organisers/leave`, `GET` and `POST /v1/join/:token`, `POST /v1/wedding/setup-step`.
- Foundations for later features: `RolesGuard` with `@Roles('admin')` (403 `FORBIDDEN`), the
  `organiserInvites` collection (only a hash of each link is stored; unaccepted invitations are
  deleted 30 days after expiry), the invitation email template, and removal of secrets (login
  codes, join links) from stored email records once sent.

**Decisions**

- Setup step 3 included now; the wedding still gets created at the end of step 2.
- Navigation shows only built sections; each feature adds its own.
- Inviting an email that already has an invitation sends it again with the new name and role.
- An Admin who wants to leave changes their role to Manager first, so a wedding always has an
  Admin; Admins can't remove themselves.
- Managers see the Organisers page read-only (the UX brief lists it as Admin-only).
- Resending gives a new link and the old one stops working, since only the link's hash is kept.
- At most 30 invitation emails per wedding per hour, so an inbox can't be flooded by resends.
- All of these are recorded in `CLAUDE.md`.

**Verification**

- 228 unit and database tests pass (API 117, web 51, shared 56, email templates 4), plus format,
  lint, typecheck and build. The 17 new database tests cover every rule above, including two
  Admins stepping down at once and each wedding's organisers staying private.
- 8 Playwright tests pass at desktop and phone sizes. The setup test now invites Rohit in step 3,
  reads the email from Mailpit, and has him join as a Manager in a second browser; axe finds no
  WCAG 2.1 AA violations on step 3, the Organisers page, the join page or the Manager's view.
- Screenshots reviewed at 390px and 1440px; this moved row buttons and confirmations onto their
  own lines on phones and put "Log out" under the name in the sidebar.
- Manual QA on 18 October with six people across two weddings:
  - resuming at step 3
  - the wrong email on a join link
  - joining while signed in
  - replaced, expired and cancelled links
  - someone in another wedding
  - role changes and the last-Admin rule
  - removal ending access
  - leaving
  - a Manager joining before setup was finished

  Two fixes came out of it: the invited name is now filled in only for the invited email, and a
  used link offers "Go to your wedding".

**Known gaps and follow-ups**

- Still to come: unassigning a removed organiser's tasks and shopping items (when TSK and SHOP
  exist), Settings (SET), editing the wedding (WED-07, WED-08), and the Organisers card on the
  dashboard (DASH-11).
- Other organisers' screens don't update live; they see changes on their next page load.
- Google sign-in (AUTH-01) and production email (Resend) are still open.
- Open product questions from the last QA: preset ceremony dates, and what a chip does to a
  renamed ceremony.

**Commits:** `20c7caa` … the commit marking this entry merged, merged into `dev` (branch
`feat/organisers`, 6 commits).

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
