---
name: new-feature
description: Plan and build a new Then What feature end to end (database, actions, screens, copy, tests, docs).
argument-hint: [what the feature should do]
disable-model-invocation: true
---

Build this feature: **$ARGUMENTS**

Work in this order, and pause after step 1 for the user's go-ahead:

1. **Plan.** Restate the feature in one or two sentences, then list:
   - who can use it (reader, author or admin; which plan),
   - which rules belong in the database,
   - which screens change,
   - the edge cases (inactive story, pending line, limits reached, signed out, phone).

   Ask about anything genuinely ambiguous. Then stop and wait.
2. **Database.** Follow the `db-migration` skill: a new migration, RLS and definer functions, activity logging if admins care, and tests in `supabase/tests/`. Run `npm run test:db`.
3. **Plan gate (if any).** Follow the `plan-feature` skill.
4. **Server Actions.** Follow the `server-action` skill.
5. **Screens.** Follow the `ui-screen` skill and `docs/DESIGN.md`. Words follow the `write-copy` skill.
6. **Docs.** Update `README.md` (what's in it) and `docs/SETUP.md` (new migration files, env vars or dashboard steps).
7. **Check.** Run `/check`, then `/ui-check` on the touched pages. Fix what fails.
8. **Review.** Run the `security-review` checklist on the diff. Summarise for the user:
   - what changed, by area
   - anything they need to do (run a migration, set an env var)
   - anything left open
