---
name: ui-check
description: Screenshot Then What pages on phone and desktop, check for layout and accessibility problems, and review them against the design guide.
argument-hint: [paths, e.g. / /pricing /dashboard]
disable-model-invocation: true
allowed-tools: Bash(node scripts/ui-check.mjs *) Read
---

1. Make sure the dev server is running at http://localhost:3000. If it isn't, ask the user to run `npm run dev`; don't start it yourself.
2. Run `node scripts/ui-check.mjs $ARGUMENTS`. With no paths, it checks `/`, `/login` and `/pricing`. Signed-in pages need a session: if the user has one, they can pass a cookie with `UI_CHECK_COOKIE="sb-…=…"`.
3. The script prints, per page and width, any horizontal overflow, unlabelled fields, duplicate ids, missing `h1` and console errors, and saves screenshots to `.ui-check/`.
4. Open each screenshot with Read and look at it against `docs/DESIGN.md`:
   - spacing and alignment
   - one gold button per area
   - type roles (serif means story)
   - empty, loading and error states
   - nothing hidden behind the bottom nav on phones
5. Report problems as page, width, what's wrong and the fix. Don't edit files unless asked.
