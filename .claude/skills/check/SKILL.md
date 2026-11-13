---
name: check
description: Run every Then What check (types, lint, database tests, build) and report what failed.
disable-model-invocation: true
allowed-tools: Bash(npm run typecheck) Bash(npm run lint) Bash(npm run test:db) Bash(npm run build) Bash(npm audit *)
---

Run these in order, and keep going even if one fails, so the user sees everything at once:

1. `npm run typecheck`
2. `npm run lint`
3. `npm run test:db`. If it fails because Postgres 16 isn't installed, say so and carry on. Don't count that as a code failure.
4. `npm run build`. If it complains about missing `SUPABASE_URL`/`SUPABASE_ANON_KEY`, rerun it with `SUPABASE_URL=https://example.supabase.co SUPABASE_ANON_KEY=dummy` in front.
5. `npm audit --omit=dev`

Then report one line per check (✓ or ✗). For each failure, give the file:line and the smallest fix. Don't fix anything unless the user asks.
