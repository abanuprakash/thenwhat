---
name: security-review
description: Check a change in Then What for security problems (access control, data exposure, injection, abuse, secrets). Use before committing anything that touches auth, data access, forms, SQL, middleware or headers.
---

# Security review checklist

Go through the diff (`git diff` plus untracked files) and check each point. Report findings as **file:line, what's wrong, a concrete fix**. Say plainly when a section is fine.

## Access
- [ ] **Protected route:** listed in `middleware.ts` **and** guarded in the page or layout?
- [ ] **New table:** RLS enabled, with a policy for every operation it allows? No `using (true)` on anything private?
- [ ] **New `security definer` function:** `set search_path`, checks `auth.uid()`/role/plan/ownership inside, execute revoked from `anon`?
- [ ] **Takes a user id or story id from the caller:** verifies the caller may act on it?
- [ ] **Plan-gated:** checked in SQL, not just the UI?

## Data exposure
- [ ] **Browser access:** no `@supabase/*` import in a `"use client"` file, and no `NEXT_PUBLIC_` secret?
- [ ] **Client props:** server-to-client props carry only needed fields (no full rows, no `pending_text` for readers, no emails)?
- [ ] **Profiles:** `profiles` selected with `PROFILE_COLUMNS`?
- [ ] **Errors:** they go through `friendly()`, and nothing technical is shown to users?
- [ ] **Hidden content:** pending and rejected lines only reach their writer, the starter and admins?

## Input
- [ ] **Validation:** every Server Action input validated with Zod, with text cleaned by `cleanText`?
- [ ] **SQL:** no SQL or PostgREST filter strings built from user input? (Fixed strings in `.or()` are fine; user text goes through `.eq()`/`.ilike()` with `cleanSearch`.)
- [ ] **Redirects:** use `safeNextPath`; links built from `env.siteUrl`, never the Host header?
- [ ] **Uploads:** decoded and re-encoded with sharp, format allow-list, size limit?

## Abuse
- [ ] **Writes:** every write has a rate limit (`limit()`), and public forms have `<BotFields />` + `looksLikeBot`?
- [ ] **Unbounded inputs:** no list, page or size without a cap?

## Platform
- [ ] **CSP:** still nonce-based? Any new external origin added deliberately to the CSP in `middleware.ts`?
- [ ] **Dependencies:** for new packages, `npm audit --omit=dev` is clean?
- [ ] **Secrets:** no secrets in code, logs or commits (`.env*` is gitignored)?

The `security-reviewer` agent can run this checklist independently.
