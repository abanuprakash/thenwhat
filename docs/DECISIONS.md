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
| 13 Nov | **Vercel Web Analytics** (`@vercel/analytics`, `components/VercelAnalytics.tsx`). Cookieless page views; `/auth/*` is never sent, invite paths become `/invite/:token`, and query strings and fragments are dropped. Middleware skips `/_vercel/*` | Banu wanted traffic numbers; the scrubbing keeps login codes, invite tokens and `?next=` values out of a third-party dashboard. Mention it in the privacy policy |
| 13 Nov | **Claude Code kit** added: CLAUDE.md, the design guide, skills, workflows, reviewer agents and a hook protecting committed migrations | To keep working with Claude in VS Code |

## Open items and what's next

**Before the wider launch**
- [ ] Buy a domain (thenwhat.in or thenwhat.app if free; check app stores and trademarks), set up Resend, remove `EMAIL_SIGNIN=off`.
- [ ] Privacy policy, terms, and export/delete-my-account (India's DPDP Act).
- [ ] Two-factor sign-in for admins (Supabase MFA).
- [ ] Supabase Pro (no pausing, daily backups).
- [ ] Cloudflare Turnstile on sign-in (setup step 10b).

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
