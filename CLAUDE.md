# Then What: notes for Claude

*You decide what happens next.* Then What is a collaborative storytelling site. Every story grows one line (≤ 280 characters) at a time, any line can branch, readers vote, and the best paths rise. Writing is invite-only, features come with per-person plans, and lines can need approval before they're published.

Read this file first. Then:
- `docs/DECISIONS.md`: what was decided and why, where setup stands, open items, and how Banu likes to work. **Read it at the start of a session.** Add a dated line to its log whenever a new product decision is made.
- `docs/DESIGN.md`: for anything visual or any wording people will see.

## Commands

```bash
npm run dev         # http://localhost:3000
npm run typecheck   # tsc --noEmit
npm run lint        # eslint .
npm run test:db     # runs every migration + SQL test on a throwaway Postgres 16 (needs Postgres installed)
npm run build       # production build
npm run test:e2e    # Playwright smoke tests; BASE_URL=… for a deployed site
npm run mock        # demo data server on :54321 (see scripts/mock-supabase.mjs) for trying the UI without Supabase
MOCK=1 npm run test:failures   # offline, server-error, upload and double-submit tests (needs the mock)
```

Before saying a change is done, run `npm run typecheck && npm run lint`. If you touched SQL, also run `npm run test:db`. The `/check` command runs all of them.

## Stack

Next.js 16.4 (App Router, Turbopack, React 19.3, Server Components and Server Actions) · TypeScript · Tailwind 3 · Zod 4 · Supabase (Postgres with ltree, Auth, Storage) · React Flow (the tree map) · sharp (avatar processing) · Vercel hosting.

## How it's put together (rules that matter)

1. **The browser never talks to Supabase.** `SUPABASE_URL` and `SUPABASE_ANON_KEY` are server-only. Never import `@supabase/*` in a client component, never add `NEXT_PUBLIC_SUPABASE_*`, never call Supabase from the browser. Reads happen in Server Components (`lib/queries.ts`, `lib/dashboard-queries.ts`); writes happen in Server Actions (`app/*actions.ts`). Avatars are served through `/media/avatars/*` (a rewrite in `next.config.ts`).
2. **The database is the final word on permissions.** Every rule (roles, plans, limits, approvals, quotas) is enforced in Postgres with RLS, `security definer` functions and triggers. The app checks too, so it can show friendly messages, but it never replaces the database check. A new rule goes into SQL first.
3. **Migrations are append-only.** Never edit a file in `supabase/migrations/` once it may have been run. Add a new file, `YYYYMMDDHHMMSS_short_name.sql`, and add tests in `supabase/tests/*.test.sql`. See the `db-migration` skill.
4. **Every Server Action follows the same order:** parse with Zod (schemas in `lib/schemas.ts`, text cleaned by `lib/sanitize.ts`) → `getViewer()` → plan feature (`hasFeature(await getEntitlements(), "…")`) → rate limit (`limit()` from `lib/security.ts`) → bot check on public forms (`looksLikeBot`) → database call → errors through `friendly()` → `revalidatePath`. See the `server-action` skill.
5. **Plans gate features per person.** Feature keys live in three places that must match: SQL `feature_names()`, `FEATURES` in `lib/schemas.ts`, and `FEATURE_INFO` in `lib/features.ts`. See the `plan-feature` skill.
6. **Profiles have column-level privileges.** Select from `profiles` with `PROFILE_COLUMNS` (from `lib/types.ts`), never `*`. Plan columns are private.
7. **Gating happens at several layers:** `middleware.ts` (every request, prefetches included, except the public live-update check `/api/stories/<id>/version`, which reads as a guest and is CDN-cached; Next 16 calls this file convention "proxy" and shows a deprecation warning, the rename is a planned follow-up) plus a check inside each page (`requireAdmin()`, the dashboard layout) plus the database. When you add a protected route, add it to `AUTHOR_PATHS` or `ADMIN_PATHS` in `middleware.ts` *and* guard the page.
8. **CSP has a per-request nonce** (`middleware.ts`). Don't add inline `<script>`s. For a third-party script, use `next/script` with the nonce from `headers().get("x-nonce")`, and extend the CSP deliberately.

## Where things are

```
app/
  page.tsx                     home feed (tabs)
  about/ changelog/ privacy/ terms/   story pages (components/StoryPage.tsx; changelog entries in lib/changelog.ts)
  s/[slug]/[lineId]/           reading view (+ full/ for continuous prose), tree/ for the map
  write/[parentId]  edit/[lineId]  new/   writing
  welcome/  login/  auth/*     onboarding and sign-in (server-side PKCE)
  u/[handle]  pricing/
  dashboard/*                  overview, review, requests, stories, activity, invites; admin: users, plans, reports, settings
  actions.ts                   reader/author actions
  account-actions.ts           sign-in, onboarding, profile, avatar
  dashboard-actions.ts         review, moderation, settings, plans, roles
  api/stories/[id]/version     live-update check for the reading page (on/off and interval: Dashboard → Settings)
components/                    UI (dashboard/ for dashboard pieces)
lib/
  queries.ts dashboard-queries.ts   all reads
  schemas.ts sanitize.ts security.ts action-utils.ts   validation, cleaning, rate limits, safe errors
  brand.ts features.ts limits.ts activity.ts types.ts
supabase/migrations/ supabase/tests/ supabase/seed-demo.sql
docs/SETUP.md  docs/DESIGN.md
```

## Writing code here

- **Components:** Server Components by default. Add `"use client"` only for interaction (forms with `useActionState`, optimistic votes, the tree map). Never pass a whole DB row into a client component, because everything you pass is serialised into the page; pass only the fields it needs.
- **Forms:** `useActionState` + a Server Action, with `<BotFields />` on anything a stranger can submit. Error text goes in `role="alert"`, confirmation in `role="status"`.
- **Calling Server Actions from the browser:** wrap form actions with `guard()` and click actions with `safely()` (`lib/client-action.ts`) so a dropped connection becomes a message instead of the error screen; forms with uncontrolled fields spread `useKeepOnError(state)` so typed text survives. Show form errors with `FormError`, and failures with nowhere else to go with `toast()`. See "When things go wrong" in `docs/DESIGN.md`.
- **Votes, follows and other in-place toggles:** don't call `revalidatePath`; return the result and keep it in the component. Redrawing the page also re-fetches every prefetched link.
- **Tours and tips:** a page people need help with gets a tour in `lib/tours.ts` (per role), `<PageTour id="…" />`, and `data-tour="…"` on what each step points at. Explain non-obvious numbers and rules with `<InfoTip>`. See `docs/DESIGN.md` §7.
- **Links in lists** (cards, rows, branches, anything that repeats): use `IntentLink` (`components/IntentLink.tsx`), which prefetches on hover, focus or touch instead of on scroll. Keep plain `<Link>` for navigation.
- **Buttons that send something:** never a bare `<button type="submit">`. Use `SubmitButton` inside forms, `NativeForm` + `SubmitButton` for plain posts to a URL, and `BusyButton` (with `busy` from `useTransition`) for click actions, all from `components/Pending.tsx`. They show the loader and stop double submits.
- **Styling:** use the Tailwind tokens and component classes from `docs/DESIGN.md` (`btn-primary`, `card`, `field`, `eyebrow`…). No new hex colours without adding them to the design guide.
- **Motion:** only the utilities in `app/globals.css` (`animate-page`, `animate-stagger`, `animate-pop`, `lift`, `press`…). Never animate layout-heavy properties, and never loop forever.
- **Copy:** the Then What voice (see `write-copy` skill). Plain, warm, a little curious. No "Oops!", no exclamation marks in errors, no jargon.
- **Accessibility:** real `<button>`/`<a>`/`<label>`, visible focus, contrast AA, `aria-current` on navigation, and every form field labelled. On phones, tables become cards; render a separate list rather than restyling the table, and keep ids unique (use an `idPrefix`).
- **Types:** keep `lib/types.ts` in step with the SQL. No `any`.

## Don't

- Don't read or print `.env*` files or secrets. Ask the user for values if you need them.
- Don't weaken RLS, `security definer` checks, the CSP, rate limits or input cleaning to make something work. Find the right fix, or ask.
- Don't add dependencies without saying why. Check `npm audit --omit=dev` afterwards.
- Don't commit, push or deploy unless asked.
