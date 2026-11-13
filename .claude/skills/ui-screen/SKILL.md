---
name: ui-screen
description: Build or change a page or component in Then What so it follows the design guide (tokens, components, motion, copy, accessibility, mobile). Use for any visual or layout work.
---

# Building a screen

Read `docs/DESIGN.md` first. It's the source of truth for colours, type, components, motion and copy.

## Structure

- **Pages are Server Components.** They fetch with `lib/queries.ts` or `lib/dashboard-queries.ts` (never with Supabase in a client component), and pass only the fields a client component needs.
- **Protected pages:** add the route to `middleware.ts` (`AUTHOR_PATHS` or `ADMIN_PATHS`) **and** guard inside the page (`requireAdmin()`, or check `getViewer()` and `canWrite()`).
- **Every route that loads data** gets a `loading.tsx` with skeletons shaped like the content, plus a `<LoadingLabel>`.
- **One `<h1>` per page** (it can be `sr-only`), with headings in order.

## Look

- **Width:** `container-narrow` for forms and profiles (620px), `max-w-[760px]` for lists, `max-w-[1100px]` for reading.
- **Classes:** reuse `btn-primary` (one per area), `btn-secondary`, `card`, `panel`, `field`, `eyebrow`, `badge-*`. In the dashboard, use the pieces in `components/dashboard/ui.tsx`.
- **Type:** serif for story text, sans for interface. Colours by token only.
- **Every state:** empty, loading, error, locked by plan (`<Locked>`), and waiting for approval where it applies.

## Motion

- **Lists:** `animate-stagger` with `style={{ "--i": i } as React.CSSProperties}`.
- **Panels opening:** `animate-reveal`.
- **Clicks that make a choice:** `animate-pop`, re-keyed per click (see `VoteControl`).
- **Clickable cards:** `lift`.
- **Small controls:** `press`.
- Nothing else. No new keyframes without adding them to the design guide.

## Phones

- Check at 390px. No sideways scroll, and leave room for the bottom nav (`pb-24`).
- Tables become cards: render a `desk:hidden` list and a `hidden desk:block` table, and give interactive children an `idPrefix` so ids stay unique.

## Accessibility

- Real `button`, `a` and `label` elements. `aria-current`, `aria-pressed` and `aria-expanded` where they apply.
- `aria-hidden` on glyphs, with `sr-only` text beside them.

## Finish

Run `/ui-check` on the pages you touched and look at the screenshots. Then `npm run typecheck && npm run lint`.
