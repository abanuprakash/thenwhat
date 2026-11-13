# Then What design guide

How Then What looks, moves and talks. Use it when you build a screen, write a button label, or review someone else's work. The code it describes lives in `tailwind.config.ts`, `app/globals.css`, `lib/brand.ts` and `components/`.

## 1. The feeling

Then What should feel like **a good paperback on a quiet afternoon**: warm paper, ink-dark serif text, a little gold. It's calm and unhurried, and curious rather than loud. The interface steps back so the story lines are the brightest thing on the screen.

Three words to check work against: **warm, calm, curious.**

## 2. Brand

| | |
|---|---|
| Name | **Then What** (two words, both capitalised). In the logo: "Then what" + a gold "?" |
| Tagline | *You decide what happens next.* |
| One-liner | Stories written one line at a time, branching wherever readers take them. |
| Logo | `components/Logo.tsx`: Source Serif 4 bold, ink, with the question mark in `gold`. On hover the "?" tilts 14°, as if leaning in. |
| Icon | `app/icon.svg`: a gold question mark whose dot splits into two branches. |

The question **"then what?"** is the product's signature. Use it where a reader is about to choose or write the next line: the branch heading, the composer title, an ending ("The end. Or is it?"). Don't use it more than once per screen, or it stops meaning anything.

## 3. Voice and copy

Write like a friend who loves stories: plain words, short sentences, a little playful, never cute.

| Do | Don't |
|---|---|
| "Your turn: write what happens" | "Submit continuation" |
| "Nobody knows what happens next. Yet." | "No data available" |
| "That didn't go to plan. Then what? Try again." | "Oops!! Something went wrong :(" |
| "This line is full of possibilities" | "Branch limit exceeded" |
| "You're doing that a lot. Wait a little and try again." | "429 Too Many Requests" |
| "Only verified authors can write. How to become one" | "Access denied" |

Rules:
- **Say what happened and what to do next.** Every error has a way forward.
- **Story words for story things:** line, branch, path, ending, the story's starter. Plain words for everything else: plan, settings, invite.
- **No exclamation marks** in errors or warnings, and at most one per screen elsewhere.
- **Sentence case** for buttons, headings and labels ("Start a story", not "Start A Story").
- **Numbers as digits** ("3 branches"), and the rupee sign for prices (₹199).
- **Name people by @handle.** Never show anyone's email to anyone but its owner.
- **Placeholders invite rather than instruct:** "And then…", "It began when…", "Something worth wondering about".

Reusable lines live in `lib/brand.ts`: `BRAND` for the name and tagline, `SPARKS` for writing nudges, `PAGE_TURNS` for loading text.

## 4. Colour

Defined in `tailwind.config.ts`. Use the token names, never raw hex in components.

| Token | Hex | Use |
|---|---|---|
| `paper` | #F6F1E7 | Page background |
| `card` | #FFFFFF | Cards: the current line, branches, dashboard panels |
| `sand` | #F1ECE1 | Quiet panels: "So far", notices, the path map |
| `chip` | #EFEAE0 | Breadcrumb chips, muted badges, skeletons |
| `cream` | #F1E4C4 | Highlight backgrounds: current chip, gold badges, "waiting" pills |
| `ink` | #1C1A17 | Main text |
| `muted` | #6B6459 | Secondary text (5.0:1 on paper) |
| `faint` | #736A5D | Labels and meta text (4.7:1 on paper, the lightest allowed for small text) |
| `line` | #D9CBA0 | Tree edges, decorative rules, avatar placeholder |
| `gold` | #8C600A | Primary action, links, the "?" (4.9:1 on paper; white on gold 5.5:1) |
| `gold-dark` | #704C06 | Hover for gold |
| `gold-soft` | #D9A441 | Path nodes and hover edges (decoration only, not text) |
| `gold-edge` | #D9C48A | Outline-button border |

Status colours (pills, used sparingly):
- green `#2F5420` on `#E3EEDC`: approved, active
- red `#7A2E1C` on `#F4E1DC`: rejected, not published
- errors in text use Tailwind's `text-red-800`

Rules:
- **Text must pass WCAG AA:** 4.5:1 for normal text, 3:1 for 24px and up. Nothing lighter than `faint` on paper.
- **Colour never carries meaning alone.** "Pending" has a word as well as a colour, and votes have the arrow as well as the gold.
- **Gold is for one primary action per area.** Two gold buttons side by side means one should be `btn-secondary`.

## 5. Type

| Role | Font | Size / weight |
|---|---|---|
| Story lines, titles, headings | Source Serif 4 (`font-serif`) | Current line 20–22px/1.6 · branches 15.5px · page title 24–28px semibold |
| Interface (buttons, labels, meta) | Inter (`font-sans`) | 13px semibold buttons · 14px body · 11–12px meta |
| Eyebrow labels | Inter, `eyebrow` class | 11px semibold, uppercase, 0.04em tracking, `faint` |

Rules:
- **Serif means story, sans means interface.** If people wrote it, it's serif.
- **Line length:** 60–80 characters for reading (`max-w-[640px]` for full-story view).
- **Numbers that update** (votes) use `tabular-nums` so they don't jiggle.

## 6. Space, shape and depth

- **Spacing:** Tailwind's 4px scale. Page gutters are `px-4` on phones and `desk:px-6`. Sections sit 22–36px apart.
- **Page widths:** reading 1100px · home and dashboard lists 760px · forms and profiles 620px (`container-narrow`) · login 420px.
- **Radius:** 3px for cards, buttons and fields (book-like, nearly square). Fully rounded only for chips, pills and avatars.
- **Borders over shadows:** `border-black/[.08]`. A shadow appears only on hover (`lift`), or for the floating "+" in the bottom nav.

## 7. Components

All in `app/globals.css` (`@layer components`) or `components/`.

| Class / component | Use |
|---|---|
| `btn-primary` | The one main action (gold). Lifts on hover, settles on press. |
| `btn-secondary` | Everything else (white with a hairline border). |
| `btn-outline-gold` | A gentle secondary action that still wants attention ("Ask for another branch"). |
| `card` / `panel` | White content box / quiet sand box. |
| `field` | Every text input, select and textarea. |
| `eyebrow` | Small uppercase section labels. |
| `badge-gold` / `badge-muted` | Tiny status labels ("Verified author", "Finished"). |
| `StatusPill` (`components/dashboard/ui.tsx`) | Request and story status in the dashboard. |
| `StatCard`, `FilterBar`, `SelectField`, `SearchField`, `Pagination`, `Empty` | Dashboard building blocks. Use these rather than inventing new ones. |
| `VoteControl`, `FollowButton` | Optimistic, with small motion feedback. |
| `LimitNotice`, `Locked` | Explain why something can't be done, and what to do about it. |
| `Skeletons` | Loading placeholders (`skeleton` class). |
| `BotFields` | Hidden spam filters, in every public form. |
| `Spark` | Writing nudges in the composer. |
| `SubmitButton`, `BusyButton`, `NativeForm`, `Dots` (`components/Pending.tsx`) | Every button that sends something. The pressed button shows the "and then…" dots (with an optional word like "Saving"), every button in that form is disabled so nothing is sent twice, and the label keeps its width. `SubmitButton` goes inside forms (it reads the form's status); `NativeForm` wraps plain posts to a URL; `BusyButton` takes `busy` from `useTransition`. Votes and follows stay instant and simply ignore taps while saving. |
| `FeedTabs` | The home feed tabs: gliding underline, dimmed list while loading, new list slides in from the side you moved towards. |

**States every screen needs:**
- **Empty:** say what will appear here, plus one action ("Tap the star on any story to follow it").
- **Loading:** a `loading.tsx` with skeletons shaped like the real content, plus an sr-only status line.
- **Error:** what happened and what to try, in `role="alert"`.
- **Locked by plan:** `<Locked feature="…" />`, which links to Pricing.
- **Waiting for approval:** a cream note, "Waiting for approval", visible only to the writer, the story's starter and admins.

## 8. Motion

Motion confirms what you did and helps you notice where things are. It never performs. Tokens are in `app/globals.css`:

| Token | Value |
|---|---|
| `--ease-out` | cubic-bezier(0.22, 0.61, 0.36, 1): things arriving |
| `--ease-soft` | cubic-bezier(0.4, 0, 0.2, 1): small state changes |
| `--dur-fast` / `--dur-base` / `--dur-slow` | 150ms / 240ms / 420ms |

| Utility | Where |
|---|---|
| `animate-page` | Every page (via `app/template.tsx`): fade and 6px rise |
| `animate-stagger` + `style={{ "--i": index }}` | Lists that arrive together (feed, branches, full story). Capped at 8 steps. |
| `animate-fade` | Content swapping in place (the current line, avatars) |
| `animate-reveal` | Panels and forms opening (report, request, confirm boxes, `<details>`) |
| `animate-pop` | A choice being made (vote arrow, follow star), once per click |
| `animate-count` | A number changing |
| `lift` / `press` | Hover lift and press settle on buttons and cards |
| `skeleton` | Loading shimmer |
| `dots` (via `Dots`) | Something is being sent: three dots rise one after another, "and then…" |
| `feed-bar` / `feed-enter` | Feed tabs: the underline glides and breathes while loading; the new list slides in 18px from the side you moved towards |
| `lm-draw` / `lm-pop` | The sign-in page's mark draws itself once: the question, then the branches, then the two dots |
| `nav-bar` / `nav-marker` / `nav-fab` | The mobile bottom nav only (`components/BottomNav.tsx`): the cream marker glides to the chosen tab the moment it's tapped, the bar tucks away while scrolling down and returns on scroll up or near the end, it steps aside while the keyboard is open, the Write button's plus turns a quarter on press and a single gold ring ripples out on arriving at the writing screen. Icons rebuild as their tab becomes active (`ic-draw` lines draw in, `ic-pop` parts land, then the fill settles, all under 600ms) and the tab you leave lets go with a small exhale (`sb-icon-letgo`) |

Rules:
- **Short:** nothing over 600ms except a one-time drawing (the path map).
- **Never loop forever,** apart from the loading shimmer, the `Dots` loader and the feed underline's breathing, which only run while something is on its way.
- **Animate only `opacity` and `transform`** (plus colour transitions). No width, height or top/left.
- **Reduced motion:** the global rule in `globals.css` lands everything instantly. Don't fight it with `!important`.
- **Delight comes in small doses:** the "?" tilt, the path drawing itself, the star pop. One moment per interaction, at most.

## 9. Layout and responsiveness

- **Breakpoint:** 760px. `mobile:` (≤760) and `desk:` (≥761) in Tailwind.
- **Phones:**
  - The bottom nav replaces the header links. Write is always in the exact centre and shown to everyone (guests go to sign in, readers to "become an author"); Home and Tree sit on the left, Profile and Dashboard on the right. Every tab is at least 52px tall and carries `aria-current="page"` when it's the page you're on; Profile only lights up on your own profile.
  - Tables become stacked cards. Render a separate list rather than restyling the table, and use an `idPrefix` so ids stay unique.
  - Sidebars drop below the main content.
  - Leave `pb-24` at the end of pages so the bottom nav doesn't cover anything.
- **Touch targets:** at least 36×36px. Vote arrows have padding for this.
- **No sideways scroll,** ever. Long tab rows scroll inside themselves (`overflow-x-auto`).
- **Check every screen at 390px and 1280px wide.** The `/ui-check` command does this.

## 10. Accessibility checklist

- [ ] Semantic elements: `button` for actions, `a` for navigation, `label` for every field (`sr-only` if visually hidden).
- [ ] One `h1` per page, with headings in order.
- [ ] Focus is visible (the global `:focus-visible` gold outline). Never `outline: none` without a replacement.
- [ ] `aria-current="page"` on the active nav link or tab. `aria-pressed` on toggles (votes, follow).
- [ ] Live feedback: `role="status"` for confirmations, `role="alert"` for errors, `aria-live="polite"` for counters.
- [ ] Decorative glyphs (▲ ★ ✓ ✦) are `aria-hidden`, with words in `sr-only` beside them.
- [ ] Images: the avatar is decorative (`alt=""`) because the handle is next to it.
- [ ] Contrast AA (see Colour).
- [ ] Reduced motion respected (see Motion).
- [ ] Works with the keyboard alone: tab through every new screen.

## 11. Icons and illustration

- Small inline SVGs, 18px, 1.6px strokes, drawn in `ink`/`faint` or `gold` when active (see `BottomNav.tsx`).
- Branching is the visual motif: nodes as circles, paths as straight or smooth lines, gold for "you are here".
- Text glyphs (▲ ▼ ★ ☆ ✦ ›) are fine for small UI, as long as they're `aria-hidden` and have a text alternative.
- No stock illustrations or emoji in the interface.
