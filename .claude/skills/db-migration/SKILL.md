---
name: db-migration
description: Add or change database tables, columns, RLS policies, triggers or SQL functions in Then What. Use whenever a change touches Postgres or Supabase (new rule, new field, new permission, new limit).
---

# Changing the database

Then What enforces every rule in Postgres. The app checks too, but only so it can show friendly messages. So a new rule starts here.

## Steps

1. **Never edit an existing file in `supabase/migrations/`.** It may already have run on someone's database. Create a new one named `YYYYMMDDHHMMSS_short_name.sql`, using a timestamp later than the newest file.
2. **Write the change.** Follow the patterns already in the migrations:
   - **Tables:** `create table public.x (...)`, then `alter table public.x enable row level security;` and explicit policies. No table is ever left without RLS.
   - **Text columns:** a length `check` plus `public.text_is_clean(col)`.
   - **Functions that change data on someone's behalf:** `language plpgsql security definer set search_path = public` (add `, extensions` if they use ltree). Check the caller inside: `auth.uid()`, `public.can_write()`, `public.is_admin()`, `public.can_manage_story(id)`, `public.has_feature('…')`. Raise plain-English messages with a fitting `errcode` (`42501` for permission, `23514` for rule broken, `54000` for limits), because these messages reach users.
   - **Function grants:** `revoke execute … from public, anon;` then `grant execute … to authenticated;`. Trigger functions: revoke from `public, anon, authenticated`.
   - **Functions that take a user id:** keep them internal (prefix `_`, revoke from everyone) and expose a version that uses `auth.uid()`.
   - **Private columns:** use column-level privileges (see the `profiles` grants in migration 5) and select explicit columns in the app.
   - **Auditing:** if the change matters to admins, log it from a trigger or a definer function with `public.log_activity('thing.happened', story_id, line_id, subject_id, jsonb)`. Then add wording for the action to `lib/activity.ts`.
   - **Views:** `with (security_invoker = true)` unless the view must read private columns. In that case filter with `where public.is_admin()` and grant select to `authenticated` only.
3. **Test it.** Add assertions to a file in `supabase/tests/` (or a new `*.test.sql`). The pattern is: switch users with `select set_config('request.jwt.claim.sub', '<uuid>', false); set role authenticated;`, use `pg_temp.expect_fail($$ … $$, 'label')` for things that must be refused, and `do $$ begin assert …, 'message'; end $$;` for outcomes. Every new rule needs at least one "allowed" case and one "refused" case.
4. **Run `npm run test:db`.** It must end with `ALL DB TESTS PASSED`.
5. **Update the app:** types in `lib/types.ts`, queries in `lib/queries.ts` or `lib/dashboard-queries.ts`, and the setup guide (`docs/SETUP.md` step 5 lists the migration files).
6. **Tell the user** to run the new file in the Supabase SQL Editor (or `npx supabase db push`).

## Gotchas

- A `stable` function sees the snapshot of the statement that called it. Anything that must see rows written a moment ago under a lock has to be `volatile` (see `line_capacity`).
- `select … for update` needs an UPDATE policy under RLS. Use `pg_advisory_xact_lock(hashtextextended(key, 0))` to serialise instead.
- Inside a `security definer` function, `current_user` is the owner. `public.is_api_request()` only means something in invoker functions and triggers.
- An `update` that matches no rows because of RLS is not an error. Test the outcome, not the absence of an exception.
- Regex repetition counts above 255 aren't allowed (`{1,500}` fails).
