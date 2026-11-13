---
name: write-copy
description: Write or edit any words users see in Then What (buttons, headings, empty states, errors, emails, notices). Keeps the warm, curious "then what?" voice.
---

# Writing in the Then What voice

Warm, calm, curious, like a friend who loves stories. Full guidance is in `docs/DESIGN.md` §3. Reusable lines are in `lib/brand.ts`.

## Checklist for every string

- Says what happened **and** what to do next.
- Sentence case. No exclamation marks in errors. No "Oops", no emoji, no jargon (no "submit", "entity", "invalid request" in user-facing text).
- Story words for story things (line, branch, path, ending, starter). Plain words for the rest.
- People are @handles. Never show someone's email to anyone else.
- Buttons are verbs that name the result: "Add my line", "Begin the story", "Send request", "Approve".
- Placeholders invite: "And then…", "It began when…".
- "Then what?" at most once per screen, only where the reader chooses or writes what's next.

## Patterns

| Situation | Pattern | Example |
|---|---|---|
| Empty | what will be here, then one action | "Tap the star on any story to follow it, and it'll wait for you here." |
| Not allowed (plan) | `<Locked feature="Starting stories" />` | "Starting stories isn't part of your plan. Compare plans." |
| Not allowed (role) | why, then how | "Only verified authors can write. How to become one" |
| Limit reached | gentle, with the number | "Each line can grow 2 branches, and this one has them all." |
| Rate limited | `TOO_MANY` | "You're doing that a lot. Wait a little and try again." |
| Waiting | who decides | "Waiting for approval. Only you, the story's starter and admins can see this line." |
| Done | short | "Saved.", "Request sent.", "Published." |
| Failure | own it, offer a retry | "That didn't go to plan. Then what? Try again in a moment." |

SQL error messages raised in migrations reach users through `friendly()`, so write those in this voice too.
