---
name: ship
description: Get Then What changes ready to push (checks, review, migration notes, commit message).
disable-model-invocation: true
---

Prepare the current changes for pushing:

1. Run `/check`. Stop here if anything fails, and show what failed.
2. Run the `security-review` checklist on `git diff`. Stop on anything serious.
3. **Migrations:** list any new files in `supabase/migrations/` and remind the user to run them on their Supabase project before or together with the deploy (SQL Editor, in order).
4. **Env vars:** list any new or changed environment variables, and remind the user to add them in Vercel → Settings → Environment Variables.
5. **Commit message:** draft a short summary line under 70 characters, then a few plain bullet points of what changed and why.
6. Ask the user whether to commit. Commit only if they say yes, and never push unless they ask.
