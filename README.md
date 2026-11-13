# Then What

*You decide what happens next.*

Stories written one line at a time. Any line can branch, readers vote, and the best paths rise to the top. Every page ends on the same question: then what?

This is the MVP from the *MVP: Lean Architecture* plan: one Next.js app and one Supabase project, with no other infrastructure.

**Setting it up?** Start with [docs/SETUP.md](docs/SETUP.md), which goes step by step from an empty Supabase account to a live site.

## What's in it

- **Home:** Trending (activity with time decay), New, Top, Finished and Following tabs.
- **Reading:** the current line, a breadcrumb back to the opening, the next lines ranked by community score, "Show more branches", and a "Your path" mini map.
- **Voting:** up and down votes that update instantly (`useOptimistic`). Branches are ranked by the Wilson score lower bound, so a brand-new line with one upvote doesn't jump ahead of a well-tested one.
- **Writing:** a 280-character composer with a live counter, checked again on the server and in the database. Verified authors can start new stories with a title, genre and opening line.
- **Endings:** a story's starter can mark a leaf line as a finished ending, and the story then shows up under Finished.
- **Read full story from here:** the whole path as continuous prose.
- **Tree map:** React Flow, with pan, zoom, click-to-jump and your path highlighted.
- **Live updates:** new branches and vote counts appear on open pages through Supabase Realtime.
- **Profiles:** karma, stories started, lines written, recent lines and the invite chain. You can edit your handle, name, bio and avatar.
- **Invites:** each author gets a set number of invite links (3 by default), which expire after 7 days. Accepting one upgrades a reader to author.
- **Story limits:** admins set how many branches any line can have and how long any path can get. With 2 branches, A can only have A1 and A2, A1 can only have A11 and A12, and so on. Writers see the limits as they write: "2 of 2 branches used", "line 4 of 5", "This will be the last line on this path". When a line is full, the composer is hidden. Each story can have its own limits.
- **Limit requests:** an author who hits a limit can ask for more room. The request goes to the story's starter and to admins in the dashboard. Approving grants extra branches on that line, or extra lines on every path of the story.
- **Dashboard** (`/dashboard`, authors and admins only):
  - **Authors** see their own stories, requests on those stories, the activity on them, and their invites. They can make their own stories inactive.
  - **Admins** see everything, plus Users (roles, a table of what each role can do), Reports, Settings, and the full activity log. They can inactivate any story.
- **Inactive stories:** hidden from everyone except the starter and admins, and closed to new lines, votes and follows. If an admin switched a story off, only an admin can switch it back on.
- **Activity log:** every important change is recorded by database triggers: joins, role changes, stories, lines, hides, endings, requests, invites and settings. Nobody can edit or delete it through the app.
- **Roles:** reader, author and admin, enforced three times: in middleware, in the UI, and by row-level security in Postgres.
- **Moderation:** anyone signed in can report a line. The third report hides it until an admin reviews it on `/admin`, where admins can also change roles.
- **Mobile:** a responsive layout, with bottom navigation below 760px.

## Stack

| | |
|---|---|
| App | Next.js 15 (App Router), React 19, TypeScript |
| Styling | Tailwind CSS, using the prototype's palette with Source Serif 4 and Inter |
| Data | Server Components and Server Actions, with `useOptimistic` for votes and follows |
| Tree map | `@xyflow/react` (React Flow) |
| Validation | Zod, sharing the same schemas between forms and Server Actions |
| Database | Supabase Postgres with `ltree`, triggers, SQL functions and RLS |
| Auth | Supabase Auth: magic link and Google |
| Hosting | Vercel and Supabase |

## Project layout

```
app/
  page.tsx                        homepage tabs
  s/[slug]/[lineId]/page.tsx      reading view
  s/[slug]/[lineId]/full/         read full story from here
  s/[slug]/tree/page.tsx          tree map
  write/[parentId]/page.tsx       composer
  new/page.tsx                    start a story
  u/[handle]/page.tsx             profile
  invite/[token]/                 accepting an invite
  dashboard/                      overview, requests, stories, activity, invites, users, reports, settings
  login/  auth/callback/  auth/signout/
  actions.ts                      every write: vote, writeLine, createStory, invites, admin…
components/                       VoteControl, MiniTree, TreeMap, Composer, BottomNav…
lib/
  queries.ts                      every read
  schemas.ts                      Zod rules
  supabase/                       server and browser clients
  tree-layout.ts                  tidy tree layout for the mini map and tree map
middleware.ts                     session refresh and role gating
supabase/
  migrations/                     schema, triggers and functions, RLS
  seed-demo.sql                   optional demo stories from the prototype
  tests/                          SQL tests for triggers and RLS
e2e/                              Playwright smoke tests
```

## Working with Claude Code

Open the folder in VS Code with the Claude Code extension. Claude reads `CLAUDE.md` automatically.

| Type it | What happens |
|---|---|
| `/new-feature <what you want>` | Plans the feature, waits for your OK, then builds database → actions → screens → docs → checks |
| `/check` | Types, lint, database tests, build, audit, with one line per check |
| `/ui-check / /pricing` | Phone and desktop screenshots, plus layout and accessibility flags, reviewed against the design guide |
| `/review` | Security and design reviewers go over your changes (no edits) |
| `/ship` | Checks, review, migration and env-var reminders, a commit message, then asks before committing |

Claude also uses these on its own when a task calls for them: `db-migration`, `plan-feature`, `server-action`, `ui-screen`, `write-copy` and `security-review` (in `.claude/skills/`). The design guide is `docs/DESIGN.md`. A hook stops Claude from editing migrations that are already committed, and `.env` files are off-limits to it.

## Scripts

```bash
npm run dev        # local dev server on :3000
npm run build      # production build
npm run typecheck
npm run lint
npm run test:db    # runs migrations and SQL tests on a throwaway local Postgres 16
npm run test:e2e   # Playwright smoke tests (BASE_URL=… to point at a deployment)
```

`test:db` covers the parts most likely to break quietly:

- Signup creates a profile.
- Path and depth come from the parent line.
- Counters update when lines and votes change.
- Readers can't write, and nobody can promote themselves.
- The 10-lines-an-hour limit holds.
- Each invite works once, and each author has three slots.
- The third report hides a line.
- Endings can't be continued.
- Anonymous visitors can read but can't write.

## Plans, approvals and onboarding

- **First sign-in:** people choose their name and a unique handle (suggested from their email or Google name) and a photo (upload, Google photo, or initials). Until they do, every page sends them to `/welcome`.
- **Plans (per person):** Free, Author and Author Pro by default.
  - Admins choose which features each plan includes, and set limits (stories, invites), under **Dashboard → Plans**.
  - Admins move people between plans under **Users**, with an optional end date.
  - The features are: voting, following, reporting, writing, editing, starting stories, inviting, asking for more room, reviewing requests, story rules and the approval queue. The database enforces every one.
  - There's no payment provider yet.
- **Approval:** new lines and edits can wait for the story's starter or an admin before readers see them.
  - Set it for the whole site under Settings. Each story can override it, from Stories.
  - Pending lines hold their branch slot, can't be voted on or continued, and appear under **Dashboard → Review**.
- **Edits:** writers can change their own line until someone continues it. On approval-required stories, readers see the old text until the edit is approved.

## Security

- **The browser never talks to the database.**
  - The Supabase URL and key are server-only. Pages, server actions and a small polling endpoint are the only things the browser calls.
  - Profile photos are served through `/media/…` on our own domain.
  - The network tab shows our own routes, never database queries.
  - Encryption in transit is HTTPS (TLS) with HSTS. Supabase encrypts data at rest.
  - End-to-end encryption doesn't fit a public reading site. The real protection is that the server only ever sends what that person is allowed to see.
- **Session cookies:** HttpOnly, Secure and SameSite=Lax, so page scripts can't read them.
- **Plan details:** private, using column-level privileges.
- **Sign-in protection:**
  - Rate limits per IP and per email, a honeypot field, and optional Cloudflare Turnstile.
  - The same reply whether or not an account exists.
  - Sign-in links always point at `NEXT_PUBLIC_SITE_URL`, never at the request's Host header.
- **Form spam:** every form has a honeypot and a minimum fill time. Every write has a per-user rate limit, kept in Postgres.
- **Uploads:** images are decoded and re-encoded server-side (sharp) to 256×256 WebP, which strips metadata and GPS. Only real JPEG/PNG/WebP/GIF images are accepted; never SVG.
- **Text input:** Unicode-normalised, with control characters, zero-width characters and bidi-override characters removed. The database rejects them too.
- **Injection:**
  - No SQL is built from strings anywhere. Queries go through PostgREST parameters and SQL functions.
  - Search text is cleaned to a safe character set.
  - React escapes all output.
- **Errors:** technical database errors are logged on the server and replaced with a generic message.
- **Dependencies:** Next.js 15.5.29, React 19.1.10, Zod 4.6.7 and sharp 0.35.5, all patched for the published advisories, including React Server Components RCE and middleware bypass. Next's image optimiser is switched off.
- **Roles are checked four times:**
  - In middleware, on every request to an author or admin page, prefetches included.
  - Again on admin-only pages themselves.
  - In the UI, which hides controls people can't use.
  - Last and most important, in Postgres, through row-level security and `security definer` functions that check the caller's role.
- **Limits can't be bypassed.** They're enforced in the `lines_before_insert` trigger, under an advisory lock, so two people can't both take the last branch.
- **Writes are validated twice:** by Zod schemas in Server Actions, and by `CHECK` constraints in the database. Search input is cleaned to a safe set of characters before it reaches a query.
- **Content Security Policy:** a strict policy with a fresh nonce on every request, plus `X-Frame-Options: DENY`, HSTS, `nosniff`, a referrer policy and a permissions policy.
- **No caching of private pages:** signed-in pages are sent with `Cache-Control: private, no-store`.
- **Protected sign-in flow:** only the public anon key ever reaches the browser, and sign-in redirects only follow paths on this site.
- **Abuse limits:** lines per hour, invite slots, at most 5 pending requests per author, and auto-hiding after 3 reports.

## Voice

The name is the product's question, so the copy leans into it:
- The branches under each line are headed "Then what?".
- The composer is titled "Then what?", with an "And then…" placeholder and a **"Stuck? Get a spark"** button. It offers a random story nudge (in `lib/brand.ts`) and never writes for anyone.
- Buttons read "Your turn: write what happens", and an ending says "The end. Or is it?".
- The logo's gold question mark leans in when you hover over it.

## Motion

The motion is gentle and short (150–420 ms, soft ease-out, never bouncy):
- **Pages:** each one fades and rises in, and lists arrive one item after another.
- **Feedback:** the vote arrow and follow star give a small pop, and the number eases in.
- **The "Your path" map:** it draws the path, and the current line gives two soft rings.
- **Controls:** buttons lift slightly on hover and settle on press. Panels and disclosures reveal softly, and loading pages show a slow shimmer.
- **Reduced motion:** if someone has asked their device for less motion, everything appears at once.

## Accessibility

- **Navigation:** a skip link, visible focus outlines, and `aria-current` on navigation.
- **Forms:** every field has a real label. Errors and confirmations are announced (`role="alert"` / `role="status"`).
- **Tables:** dashboard tables have captions and row and column headers. On phones they become cards, rendered as separate markup rather than CSS tricks, so screen readers never see both.
- **Icon controls:** icon-only controls have labels, and decorative glyphs are hidden from screen readers.
- **Colour and motion:** small text passes WCAG AA contrast, and animations respect `prefers-reduced-motion`.

## Changes from the architecture doc

The build follows the plan, with these fixes and additions:

- **ltree labels:** UUID hyphens aren't allowed in ltree labels, so `ltree_label()` swaps them for underscores.
- **Counter triggers run as `security definer`**, so a reader's vote can update `lines`, which readers can't update directly.
- **First admin:** the setup guide makes your own account admin with one line of SQL. No seed user is needed.
- **Invites can't be reused:** `accept_invite` locks the row and rejects used, expired and own invites. Slots are limited to three per author.
- **Votes go up and down** with Wilson-score ranking, and stories have **genres** and **endings**, to match the prototype screens. The doc only had upvotes.
- **Users can't promote themselves:** a trigger blocks role changes through the API, so only admin functions can change roles.
- **Root lines** can only be created through `create_story()`.
- **UI components are hand-written with Tailwind** instead of generated with shadcn/ui. The prototype's look is simple enough that the extra dependency didn't pay for itself.
- **Accessibility:** two prototype colours, the light grey text and the gold, are one shade darker so small text passes WCAG AA contrast.
