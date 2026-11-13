# Then What: decisions, status and what's next

This is the memory of how Then What got here: what was decided, why, and what's still open. Read it alongside `CLAUDE.md` (how to work) and `docs/DESIGN.md` (how it looks and sounds). When a new decision is made, add a line to the log with the date.

## The product in one paragraph

Then What (formerly StoryBranch) is a collaborative storytelling site:
- **How stories grow:** they're written one line (≤ 280 characters) at a time, any line can branch, readers vote, and branches are ranked by a Wilson score.
- **Who can write:** writing is invite-only (verified authors). Features come with per-person plans, and new lines can be held for approval.
- **Built by:** Banu Prakash (Chennai), with Claude, starting November 2026.
- **Origin:** a PRD, wireframes and a Claude Design prototype, which became an MVP architecture (one Next.js app, one Supabase project, about 6 weeks for 1–2 developers, $0–45 a month).

## Where things stand (13 Nov 2026)

- **Code:** the MVP is built, with dashboard, plans, approvals, security hardening, motion and rebrand.
- **Repo:** `abanuprakash/thenwhat` on GitHub (default branch `master`). Claude makes changes on a branch and opens a pull request; Banu reviews and merges.
- **Setup:** Banu is setting up locally (`docs/SETUP.md`, plus the "Then What setup guide" doc on claude.ai). He's run the migrations, is signing in, and is working through Google sign-in (step 11).
- **Recently fixed while setting up:**
  - `PGRST125 Invalid path`: `SUPABASE_URL` included `/rest/v1/`. The URL is now trimmed to its origin (`lib/supabase-url.ts`).
  - "Continue with Google" returned 303 and stopped there: the CSP `form-action` was missing the Supabase origin, so the browser blocked the redirect hop. Fixed in `middleware.ts`.
- **Next steps for launch:**
  1. Finish Google sign-in.
  2. Deploy to Vercel (`EMAIL_SIGNIN=off`).
  3. Make himself admin.
  4. Invite about 10 people with invite links.
  5. Move them to the Author plan.

## Decision log

| Date | Decision | Why |
|---|---|---|
| 12 Nov | **Stack:** Next.js 15 App Router + Supabase (Postgres, ltree, Auth, Storage) + Vercel; React Flow for the tree map; Tailwind (no shadcn) | The lean MVP plan: two services, logic in Postgres |
| 12 Nov | **Up and down votes** with Wilson-score ranking, genres, and endings marked by the story's starter | Matches the prototype screens (the architecture doc only had upvotes) |
| 12 Nov | **Fixes to the plan:** ltree labels swap `-` for `_`; counter triggers run as `security definer`; first admin set with one line of SQL; invites can't be reused; root lines only via `create_story()` | Gaps found while reviewing the plan |
| 12 Nov | **Two colours darkened** (`faint` #736A5D, `gold` #8C600A) | WCAG AA contrast for small text |
| 12 Nov | **Dashboard at `/dashboard`** for authors and admins. Authors see their own stories, requests and activity; admins see everything plus Users, Plans, Reports and Settings | Least privilege: authors shouldn't manage others' stories or roles |
| 12 Nov | **Limits:** site-wide branches per line and lines per path (blank means no limit), per-story overrides, and limit requests approved by the story's starter or an admin. Approving branches adds them to one line; approving depth extends the whole story | Banu's example: limit 2 means A has only A1 and A2, A1 only A11 and A12 |
| 12 Nov | **Inactive stories** are hidden and frozen. If an admin switched a story off, only an admin can switch it back on | Moderation without deleting |
| 12 Nov | **Activity log** written only by triggers and definer functions; can't be edited from the app | Auditability |
| 12 Nov | **Story access:** anyone can read published stories, but only the starter and admins manage them | Banu chose "read yes, manage no" over private-by-default |
| 12 Nov | **Plans are per person:** Free ₹0, Author ₹199, Author Pro ₹499 (defaults, editable). Admins edit the feature matrix in Dashboard → Plans and assign plans by hand, with an optional end date. Writing needs both an invite (role) and a plan | Banu chose per-person plans. Reporting stays free by default so abuse can always be flagged |
| 12 Nov | **No payment provider yet**; Razorpay is planned | Banu's choice: build the gating now, add payments later |
| 12 Nov | **Approvals:** new lines and edits can need approval (site default plus a per-story override). The starter's and admins' own lines publish directly. Pending lines hold their branch slot | Banu's request |
| 12 Nov | **Edits:** writers can edit their own line until someone continues it; on approval stories, edits wait for approval | Changing a line others built on would break their branches |
| 12 Nov | **Onboarding:** a welcome screen for name, a unique handle (suggested from email or Google), and a photo (upload, Google photo or initials). Reserved handles include admin, support and thenwhat | Banu's request |
| 12 Nov | **Server-only data access (BFF):** the Supabase URL and key never reach the browser. Sign-in (magic link and Google, PKCE) runs on the server, polling replaces Realtime, avatars go through `/media` | Banu asked that the network tab reveal as little as possible |
| 12 Nov | **No end-to-end encryption.** Instead: HTTPS + HSTS, encryption at rest, the server sending only permitted data, HttpOnly cookies, and a CSP nonce | E2E would stop the server from ranking and showing public stories |
| 12 Nov | **Attack protection:** rate limits in Postgres, honeypot + timing on forms, optional Turnstile, text cleaning (control, zero-width and bidi characters), avatars re-encoded with sharp, column privileges on profiles, `friendly()` errors | Banu asked for all common attacks to be handled |
| 12 Nov | **Upgraded** to Next 15.5.29, React 19.1.10, Zod 4.6.7 and sharp 0.35.5; image optimiser off | Next 15.3.3 had critical advisories (RSC remote code execution, middleware bypass) |
| 12 Nov | **Emails stay only in Supabase `auth.users`**, never in `profiles` | Profiles are public |
| 12 Nov | **Google sign-in at launch** | Banu's choice |
| 12 Nov | **Motion:** gentle (150–420ms, ease-out, no bounce, never looping), reduced motion respected | Banu asked for neat, elegant transitions that never feel forced |
| 12 Nov | **Name: Then What.** Tagline *You decide what happens next.* The voice uses the question ("Then what?", "And then…", "Your turn", the Spark button) | Chosen over And Then, Your Turn and What Next. Forkline was taken on Product Hunt; Kathai is close to existing Katha apps |
| 13 Nov | **First users sign in with Google only** (`EMAIL_SIGNIN=off`). Resend plus a custom domain come before the wider launch | Supabase's built-in sender only emails team members, 2 an hour. `vercel.app` can't be verified in Resend |
| 13 Nov | **Code moved to GitHub** (`abanuprakash/thenwhat`). Changes go on branches as pull requests | Banu gave Claude repo access so he no longer applies changes by hand |
| 13 Nov | **Vercel Web Analytics and Speed Insights** (`@vercel/analytics`, `@vercel/speed-insights`, `components/VercelInsights.tsx`). Cookieless page views and real-user Core Web Vitals; for both, `/auth/*` is never sent, invite paths become `/invite/:token`, and query strings and fragments are dropped. Middleware skips `/_vercel/*` | Banu wanted traffic numbers; the scrubbing keeps login codes, invite tokens and `?next=` values out of a third-party dashboard. Mention it in the privacy policy |
| 13 Nov | **Failure states:** every action call is guarded (offline, dropped connection, server error) and shows a message in the Then What voice with small drawings; typed text survives failed submits; a connection note; error pages with an offline version; photos checked before upload; a mock data server and failure tests in the repo | Banu asked for all failure and negative cases to be handled, shown creatively |
| 13 Nov | **Known issue: saves can hang on Next 15.5.** In production builds, about half of fast Server Action saves leave the button pending even though the server answered (React bug bundled in Next 15.5, fixed in React in Jan 2026). Next 15.3.9: 12/12 saves worked; Next 16.4.6 bundles the fixed React. Fixed by upgrading to Next 16 (below) | Found while testing failure states; it predates them |
| 13 Nov | **Upgraded to Next.js 16.4.6** (React 19.3.1, Turbopack builds, eslint-config-next 16 flat config). Kept `middleware.ts` for now (deprecated name, still runs on the edge runtime); renaming to `proxy.ts` (Node runtime) is a separate step. Removed the webpack-only warning filter; added `data-scroll-behavior="smooth"` so page changes still jump to the top. Fixed the components the new React lint rules flagged | Fixes the stuck-save bug (24/24 saves vs 8/12 on 15.5); one migration instead of two. Next 16 prefetches in smaller pieces: about 2× more background prefetches and 1.3–1.8× more data calls per page view, mostly the middleware's session and profile checks. Trimming that is an open item |
| 13 Nov | **Footer and story pages.** Footer on every page (mark, links, © year, "Made in India / Tamil Nadu" fading). New pages told as stories: About us (`/about`), Changelog (`/changelog`, from `lib/changelog.ts`), Privacy policy (`/privacy`) and Terms (`/terms`), each as chapters on a path. Then What is run by Vimalan & Team in Chennai; Indian law, Chennai courts. Sign-in links to the terms and privacy policy. The contact address is a placeholder (`OPERATOR.contactEmail` in `lib/brand.ts`) | Banu asked for a footer and these pages in a storytelling style. The privacy policy describes what the code actually does (data, cookies, analytics, processors) |
| 13 Nov | **Feature guide at `/guide`.** "Every feature, explained": 16 chapters on the story path, with screenshots and short clips from the demo data (`public/media/guide/`, WebP and MP4, about 3 MB, served from `/media/` so the middleware skips them and they cache for a year). Tables turn into cards on phones. Linked from the footer, the About page and the Tours panel on your profile. The text comes from the features doc, minus the developer notes and internal to-dos. Static page, so it costs nothing to serve | Banu asked for the features doc to be a page in the product. Clips play only while on screen, and wait for a tap with reduced motion |
| 13 Nov | **Footer in ink; "Vimalan & Team".** The footer is now dark (ink, with `dusk` text and a gold thread on top) so it stands apart from the page. The place name rolls between India and Tamil Nadu with a gold underline instead of a plain fade. The operator is credited as "Vimalan & Team" everywhere (`OPERATOR.by`) | Banu asked for the name change, a better animation and a footer that differs from the body |
| 13 Nov | **Guided tours and info tips.** One tour per page (home, reading, tree map, writing, starting a story, dashboard, settings, profile), each written per role. Shown once per page and role: signed-in people in `profiles.tours_seen` (`mark_tour_seen`, `reset_tours`), guests in local storage. Replay from the header **?**, the settings page's "Take the tour", or the Tours panel on your profile ("Show all tours again"). `InfoTip` explains karma, profile numbers, plan, invite chain, branch ranking and limits, site rules, every settings section, invite slots and the @handle. Built in-house (no library) to match the design guide and CSP. Automated browsers never get tours on their own | Banu asked for tours per role, replayable from the profile and settings, and creative tooltips with drawings |
| 13 Nov | **Fewer calls everywhere.** (1) Votes and follows no longer redraw the page (`revalidatePath` removed); the buttons keep the saved result. (2) On page loads the middleware hands the checked user and profile to the page (`lib/viewer-header.ts`, GET/HEAD only; Server Actions still fetch fresh). (3) Fonts self-hosted with `next/font/local` from Fontsource (Source Serif 4 weight-only file, Inter); Google Fonts removed from the CSP. (4) Database: indexes for stories by author and the Top feed; every RLS rule wraps `auth.uid()`, `is_admin()`, `has_feature()` in `(select …)`; reading lines uses an EXISTS on stories instead of `story_visible()` per row; trending stored on `stories.trending_score`, updated by trigger on votes/lines and every 5 min by pg_cron; dashboard lists use estimated counts. (5) Live updates fingerprint only what the open page shows (`story_poll(story, line)`, `lines.changed_at`). (6) Speed Insights sampled at 25%, analytics only in production; avatars cached for a year | Banu asked for all of the audit's fixes. Measured per action and page in the PR |
| 13 Nov | **Cheaper live updates and lighter prefetching.** (1) The check `/api/stories/<id>/version` is public: it reads as a guest with no cookies, is skipped by the middleware, and is shared for 1 s at Vercel's CDN (`Vercel-CDN-Cache-Control: max-age=1`), so everyone reading a story shares one answer. (2) Votes no longer bump `stories.version`; only line changes do, so a vote doesn't reload every open reader's page. (3) List links (feed, path, branches, mini tree, profile and dashboard lists) use `IntentLink`: no prefetch on scroll, prefetch on hover, focus or touch. Navigation keeps normal prefetching | Measured on production builds, signed in, per page view (master → now): prefetches Home 18→12, Story 22→16, Dashboard 38→30, Profile 25→8; data calls Home 45→33, Story 79→53, Dashboard 88→68, Profile 79→27. Each check: 2→1 function runs, 4→2 data calls, and on Vercel most checks become CDN hits. Readers see other people's votes on their next reload or the next new line |
| 13 Nov | **Live updates are a site setting.** Dashboard → Settings → Live updates: on/off and how often (1–300 s), stored in `app_settings` and changed with `update_settings`. Only the reading page checks, only while its tab is visible, never two at once; each answer carries the current setting, so open pages speed up, slow down or stop without reloading. Starts **on, every 1 s** (Banu's call). Poll rate limit raised to 600 a minute per IP | Banu wants to tune freshness against cost from the dashboard. At 1 s each open story costs about 7,200 function runs an hour (check + middleware), so Vercel's free plan covers roughly 139 reader-hours a month before anything else; raise the interval if usage climbs |
| 13 Nov | **Claude Code kit** added: CLAUDE.md, the design guide, skills, workflows, reviewer agents and a hook protecting committed migrations | To keep working with Claude in VS Code |

## Open items and what's next

**Before the wider launch**
- [ ] Buy a domain (thenwhat.in or thenwhat.app if free; check app stores and trademarks), set up Resend, remove `EMAIL_SIGNIN=off`.
- [ ] Privacy policy, terms, and export/delete-my-account (India's DPDP Act).
- [ ] Two-factor sign-in for admins (Supabase MFA).
- [ ] Supabase Pro (no pausing, daily backups).
- [ ] Cloudflare Turnstile on sign-in (setup step 10b).

**Next.js 16 follow-ups**
- [ ] Rename `middleware.ts` to `proxy.ts` (Node runtime) and re-test every protected route.
- [ ] Set the contact address in `lib/brand.ts` (`OPERATOR.contactEmail`) before launch; until then Privacy and Terms say it's coming.
- [ ] Have a lawyer read `/privacy` and `/terms` before launch, especially the age line (under 18 with a parent's permission), the content licence and liability.
- [ ] Add a changelog entry (`lib/changelog.ts`) with every release.
- [x] Turn off viewport prefetching on long lists (`IntentLink`).
- [ ] Trim the middleware's cost per request: skip the profile read for prefetches of public pages, read the session with `getClaims()`, or put role and onboarded in the token. Measure with `scripts/mock-supabase.mjs` (`MOCK_LOG=1`).
- [ ] Cache public data (feeds, story text, trees) with `"use cache"` and tags, cleared on writes.

**Soon after**
- [ ] Razorpay payments (UPI and cards), switching plans automatically.
- [ ] Notifications (line approved, request answered, someone continued your line).
- [ ] Sentry and uptime alerts.
- [ ] GitHub Actions running typecheck, lint, DB tests and e2e on every pull request.

**Later**
- [ ] Vercel Firewall, and bot protection on all forms.
- [ ] Search and genre filters.
- [ ] Co-authors, and private stories for invited readers.
- [ ] AI-assisted moderation.
- [ ] PWA, then native apps.

**Offered, not yet decided:** an admin-only email column in Dashboard → Users (through a secure function, never in profiles).

## Working with Banu

- **Changes:** he often prefers being told the exact changes so he can apply them himself, rather than getting a whole new zip. Show file-by-file edits with the before and after.
- **Writing:** conversational and human, not AI-sounding. That goes for the app's copy, the docs and the replies.
- **Background:** tech lead with deep Next.js, React and security experience (OWASP, BFF, OAuth/PKCE). Explain trade-offs and skip the basics.
- **Before acting:** ask before anything expensive or ambiguous, and give a recommendation with each question.
- **Commits:** credit Banu only: author and committer `abanuprakash`, with no Claude co-author or session lines in commit messages.
