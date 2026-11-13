---
name: plan-feature
description: Put a Then What feature behind a plan (or add a new plan feature). Use when something should only be available on some plans, e.g. "make X a paid feature", "only Author Pro can Y".
---

# Adding a plan-gated feature

Plans are per person (Free, Author, Author Pro to start with). Admins switch features on and off per plan in Dashboard → Plans, so the code only needs to know the feature's **key**.

## 1. Database (new migration; see the `db-migration` skill)

- Add the key to `public.feature_names()` with `create or replace function`, keeping the existing keys in order.
- Seed `plan_features` rows for every plan, choosing sensible defaults (`enabled`, and `quota` if it's countable; `null` means unlimited).
- Enforce it where the action happens: in the RLS policy (`… and public.has_feature('your_key')`) or inside the `security definer` function (`if not public.has_feature('your_key') then raise exception '… isn''t part of your plan' using errcode = '42501'; end if;`).
- For quotas: `public.feature_quota('your_key')`, then compare with a count.
- Tests: someone on a plan without it is refused; with it, allowed; an admin is always allowed; an expired plan falls back to Free.

## 2. App

- `lib/schemas.ts`: add the key to `FEATURES`, in the same order.
- `lib/features.ts`: add `{ key, label, detail, quota? }` to `FEATURE_INFO`. The label shows on Pricing and in Dashboard → Plans, so write it as a plain benefit ("Invite authors").
- **Server Action:** `if (!hasFeature(await getEntitlements(), "your_key")) return { error: PLAN_MESSAGE };` before the database call.
- **Page:** hide or swap the control. Use `<Locked feature="Doing the thing" />` for a whole page, `<Locked compact … />` inline, or an `allowed` prop on interactive components (see `VoteControl`, `FollowButton`).
- `my_entitlements()` picks up the new key automatically.

## 3. Check

- `npm run test:db && npm run typecheck && npm run lint`
- As a Free user the control is hidden or explained. As a plan with the feature it works. Pricing lists it.
