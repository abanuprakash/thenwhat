# Setting up Then What, step by step

This guide takes you from an empty Supabase account to a live site on Vercel. Budget about an hour the first time. Every step is in a dashboard you control, and nothing here costs money until you outgrow the free tiers.

You'll need:

- Node.js 20.9 or newer (`node -v` to check; Next.js 16 needs at least 20.9)
- A GitHub account (the code is already there)
- A [Supabase](https://supabase.com) account
- A [Vercel](https://vercel.com) account (sign in with GitHub, it makes step 8 easier)
- Optional: a Google Cloud account, if you want "Continue with Google"

---

## 1. Get the code running locally

```bash
git clone https://github.com/<your-github-username>/thenwhat.git
cd thenwhat
npm install
cp .env.example .env.local
```

Leave `.env.local` open; you'll fill it in at step 4.

## 2. Create the Supabase project

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard) and click **New project**.
2. Name it `thenwhat`.
3. Set a database password and save it in your password manager. You'll only need it if you use the Supabase CLI.
4. Pick the region closest to your readers. For India that's **South Asia (Mumbai)**.
5. Click **Create new project** and wait a minute or two while it starts.

## 3. Create the database

The whole database (tables, triggers, security rules and functions) lives in seven SQL files in `supabase/migrations/`. Pick one of these two ways to run them.

**Option A: paste into the SQL editor (easiest)**

1. In your project, open **SQL Editor** → **New query**.
2. Open `supabase/migrations/20261112000001_schema.sql`, copy all of it, paste it in, and click **Run**. You should see "Success. No rows returned".
3. Do the same with `20261112000002_functions_triggers.sql`.
4. Then `20261112000003_rls.sql`.
5. Then `20261112000004_dashboard_limits.sql`. This adds the dashboard, the story limits, requests and the activity log.
6. Then `20261112000005_plans_approvals_security.sql`. This adds plans, line approval, edits, onboarding and rate limits.
7. Then `20261113000001_live_updates.sql`. This adds the live-updates switch and interval to Dashboard → Settings.
8. Then `20261113000002_votes_dont_refresh_readers.sql`. Votes stop reloading open reading pages.

Run them in that order. Each one builds on the one before.

> **Already ran some of them?** Run only the ones you haven't. Each only adds to what's there.

**Option B: the Supabase CLI (better once you're making changes)**

```bash
npx supabase login
npx supabase link --project-ref <your-project-ref>   # the ref is in the dashboard URL
npx supabase db push
```

To check it worked, open **Table Editor**. You should see 13 tables: `activity`, `app_settings`, `follows`, `invites`, `limit_requests`, `lines`, `plan_features`, `plans`, `profiles`, `rate_limits`, `reports`, `stories` and `votes`.

## 4. Connect the app to Supabase

1. In Supabase, open **Project Settings** → **API** (in newer dashboards: **API Keys**).
2. Copy the **Project URL** and the **anon public** key. The newer **publishable** key also works.
3. Paste them into `.env.local`:

```bash
SUPABASE_URL=https://abcdefghijklm.supabase.co
SUPABASE_ANON_KEY=sb_publishable_...
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_TURNSTILE_SITE_KEY=
```

The URL and key stay on the server: the browser only ever talks to your own site. Never put the **service_role** / secret key in this app.

## 5. Set up sign-in

1. In Supabase, open **Authentication** → **URL Configuration**.
2. Set **Site URL** to `http://localhost:3000` for now. You'll change it at step 8.
3. Under **Redirect URLs**, add `http://localhost:3000/auth/callback`.
4. Email sign-in (magic links) is on by default under **Authentication** → **Sign In / Providers** → **Email**. Nothing more to do there.

> **Heads-up on email limits.** Supabase's built-in email sender only allows a few sign-in emails an hour and is meant for testing. Before you invite real people, add your own SMTP under **Authentication** → **Emails** → **SMTP Settings**. [Resend](https://resend.com) has a free tier and takes about ten minutes to set up.

## 6. Run it, sign in, and make yourself admin

```bash
npm run dev
```

1. Open http://localhost:3000, click **Sign in**, enter your email, and click the link in the email you get. The first time, you'll pick your name, handle and photo.
2. Everyone starts as a reader, including you. To make yourself the first admin, go to **SQL Editor** in Supabase and run this, using your own email:

   ```sql
   update public.profiles set role = 'admin'
   where id = (select id from auth.users where email = 'you@example.com');
   ```

3. Refresh the site. You'll see **+ New story** and **Dashboard** in the header.
4. Optional: to start with the six stories from the prototype, paste `supabase/seed-demo.sql` into the SQL editor and click **Run**. They'll be credited to you.

Every other author joins through an invite link. Open **Dashboard → Invites**, click **New invite link** and send it. Each author gets three invite slots by default (you can change that in Settings), and admins have unlimited invites.

### Set the story rules

Open **Dashboard → Settings**:

- **Branches per line:** how many next lines any line can have. With 2, line A can only have A1 and A2, A1 can only have A11 and A12, and so on. Once a line is full, the "Continue this line" button disappears and writers see why.
- **Lines per path:** the longest any path can get, counting the opening line. The line that reaches it is shown as the final line, and nobody can continue past it.
- **Lines per author, per hour** and **Invites per author.**

Leave the first two blank for no limit. That's the default, so nothing changes until you set them. You can give one story its own limits from **Dashboard → Stories → Story limits**.

When writers hit a limit they can ask for more room. Their request shows up under **Dashboard → Requests** for the story's starter and for admins. Approving grants extra branches on that one line, or extra lines on every path of the story.

Your handle starts as the part of your email before the @. You can change it from your profile under **Edit profile**.

## 7. Add Google sign-in (optional)

1. Go to [Google Cloud Console](https://console.cloud.google.com/) → **APIs & Services** → **Credentials**.
2. If it asks, set up the **OAuth consent screen**: choose External, then fill in the app name and your email.
3. Click **Create credentials** → **OAuth client ID** → **Web application**.
4. Under **Authorized redirect URIs**, add `https://<your-project-ref>.supabase.co/auth/v1/callback`. Supabase shows this exact URL on its Google provider page.
5. Copy the **Client ID** and **Client secret**.
6. In Supabase, open **Authentication** → **Sign In / Providers** → **Google**. Turn it on, paste both values, and save.

## 8. Deploy to Vercel

1. Push any local changes to GitHub.
2. Go to [vercel.com/new](https://vercel.com/new) and import the `thenwhat` repo. Vercel detects Next.js on its own.
3. Before clicking Deploy, open **Environment Variables** and add these three:

   | Name | Value |
   |---|---|
   | `SUPABASE_URL` | the same as `.env.local` |
   | `SUPABASE_ANON_KEY` | the same as `.env.local` |
   | `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | optional, see the Turnstile step |
   | `NEXT_PUBLIC_SITE_URL` | `https://<your-app>.vercel.app` (your real domain later) |

4. Click **Deploy**.
5. Back in Supabase, open **Authentication** → **URL Configuration** and do two things:
   - Change **Site URL** to `https://<your-app>.vercel.app`.
   - Add these **Redirect URLs**:
     - `https://<your-app>.vercel.app/auth/callback`
     - `https://*-<your-vercel-team>.vercel.app/**`, so sign-in works on preview deployments too
     - Keep `http://localhost:3000/auth/callback` for local development.

From now on, every push to `main` deploys to production. Every pull request gets its own preview link.

**Custom domain:** in Vercel, open **Settings** → **Domains** and add it. Then update `NEXT_PUBLIC_SITE_URL` in Vercel, and the Site URL and Redirect URLs in Supabase, to the new domain.

## 9. Check that everything works

Go through this on the live site:

- [ ] Home shows stories, and the Trending, New, Top, Finished and Following tabs all load.
- [ ] Signing in by email works (and by Google, if you set it up).
- [ ] Opening a story shows the line, ranked branches, the breadcrumb and the "Your path" map.
- [ ] Voting changes the number instantly and is still there after a refresh.
- [ ] Open the same story in two browser windows and vote in one. The other updates within a second or so.
- [ ] **Continue this line** publishes a line and takes you to it.
- [ ] **+ New story** creates a story.
- [ ] **View full tree map** pans, zooms, and jumps to a line when you click it.
- [ ] Invite flow: create a link, open it in a private window, sign in with another email, accept. That account can now write.
- [ ] Signed in as a reader, opening `/new` sends you to "Writing is invite-only".
- [ ] On your phone, the bottom navigation shows up.
- [ ] **Dashboard → Settings:** set branches per line to 2. On a line with two branches, "Continue this line" is gone and the "Ask for another branch" button shows instead.
- [ ] As a second author, send that request. It appears under **Dashboard → Requests**, and approving it brings the button back.
- [ ] **Dashboard → Stories:** make a story inactive. In a private window it's gone from the home page and its link shows "This branch doesn't exist".
- [ ] Signed in as an author (not admin), `/dashboard/settings` sends you back to the dashboard overview.

You can also run the automated smoke tests against any deployment:

```bash
npx playwright install chromium     # once
BASE_URL=https://<your-app>.vercel.app npm run test:e2e
```

## 10. Running costs and when to upgrade

| | Free tier | When to upgrade |
|---|---|---|
| Supabase | 500 MB database, 50k monthly users, 1 GB storage. Free projects **pause after 7 days with no activity.** | Go to Pro ($25/month) before real launch: no pausing, daily backups. |
| Vercel | Hobby plan is free for personal, non-commercial projects. | Pro ($20/month) for a commercial product or a team. |

That works out to $0 while you build and about $45 a month at launch, which matches the plan.

---

## Troubleshooting

**`PGRST125 Invalid path specified in request URL` / "You're doing that a lot" on the very first sign-in.** `SUPABASE_URL` has a path on the end (like `/rest/v1/`). It must be just `https://<project-ref>.supabase.co`. The app now trims this automatically, but fix `.env.local` anyway and restart `npm run dev`.

**"Then What can't find its Supabase settings."** `.env.local` (or the Vercel environment variables) is missing a value. Restart `npm run dev` after editing it. On Vercel, redeploy after changing variables.

**The sign-in link opens the home page but I'm not signed in.** The redirect URL isn't allowed. Check that `/auth/callback` on the exact domain you're using is in Supabase's **Redirect URLs** list.

**"Email rate limit exceeded".** That's the built-in sender's limit. Set up custom SMTP (step 5).

**Votes and new lines don't show up live.** In Supabase, open **Database** → **Publications** → `supabase_realtime` and check that `lines` is ticked. The third migration adds it, but older projects sometimes need it ticked by hand.

**"You've written 10 lines in the last hour".** That's the rate limit working. To change it, edit the `10` in `lines_last_hour` checks: in the "Authors write lines" policy in `20261112000003_rls.sql`, in `create_story` in `20261112000002_functions_triggers.sql`, and in `writeLine` in `app/actions.ts`.

**I want to undo everything and start the database over.** In the SQL editor, run `drop schema public cascade; create schema public; grant usage on schema public to anon, authenticated, service_role;` and then run the migrations again, in order. This deletes all data.

**I changed a limit but people can still write past it.** Check the story's own limits under **Dashboard → Stories → Story limits**. A per-story limit (or an approved request) wins over the site setting.

**A story vanished for everyone except me.** It was made inactive. You'll find it under **Dashboard → Stories** with the status set to Inactive, along with the reason.

**Profile picture upload fails.** Check that **Storage** has a public bucket called `avatars`. The third migration creates it. If it's missing, create it by hand, mark it public, and rerun the storage part of `20261112000003_rls.sql`.
