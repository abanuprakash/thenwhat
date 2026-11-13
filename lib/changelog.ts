import type { ArtName } from "@/components/TourArt";

/**
 * The changelog, told as a story: newest first. Each release is a line: a story-like beat (`line`)
 * and the plain changes people will notice (`changes`). Write for readers and writers, not for
 * developers: what changed for them, not how. Add an entry with each release, and when Privacy or
 * Terms change, say so here.
 */
export type Release = { date: string; title: string; art: ArtName; line: string; changes: string[] };

export const RELEASES: Release[] = [
  {
    date: "2026-11-13",
    title: "A guide for every page",
    art: "compass",
    line: "The first time you open a door, someone now walks you through the room.",
    changes: [
      "Short guided tours on the home page, stories, the tree map, writing, the dashboard, settings and your profile, written for readers, authors and admins.",
      "Replay any tour from the ? at the top of the page, or from the Tours panel on your profile.",
      "Little (i) tips explain karma, limits, how branches are ranked and every setting.",
      "A footer, with this changelog, our story, the privacy policy and the house rules.",
      "A guide to every feature, with pictures and short clips, linked from the footer and your profile.",
    ],
  },
  {
    date: "2026-11-13",
    title: "Lighter on its feet",
    art: "spark",
    line: "The pages got lighter, so the story could move faster.",
    changes: [
      "Votes and follows land instantly, without reloading the page around them.",
      "Fonts now come from our own site, so text appears sooner.",
      "Faster lists, trending and access checks as stories grow.",
    ],
  },
  {
    date: "2026-11-13",
    title: "Live updates you can tune",
    art: "pulse",
    line: "Open a story and watch it grow, without pressing a thing.",
    changes: [
      "Reading pages update on their own when a new line appears on the path, branches or map you're looking at.",
      "Admins can switch live updates on or off and choose how often stories check, from Settings.",
      "Votes no longer make the page jump while you read.",
    ],
  },
  {
    date: "2026-11-13",
    title: "When things go wrong",
    art: "shield",
    line: "Every story has a moment where the lights flicker. Now we tell you what's going on.",
    changes: [
      "Friendly messages, with a drawing, when you're offline or something fails on our side.",
      "What you were typing stays put if a save doesn't go through.",
      "Saves never get stuck on \"Saving…\" any more.",
    ],
  },
  {
    date: "2026-11-13",
    title: "Think twice, then decide",
    art: "check",
    line: "Some decisions deserve a second look before the page turns.",
    changes: [
      "Approving, rejecting, pausing and publishing now ask first, and tell you what will happen.",
      "Votes and follows got small, satisfying animations.",
      "Every button shows it's working, and can't be pressed twice by accident.",
      "A new sign-in page, and smoother tabs on the home feed.",
    ],
  },
  {
    date: "2026-11-13",
    title: "A better way around on phones",
    art: "tabs",
    line: "The map got smaller, so it would fit in your pocket.",
    changes: [
      "A new bottom bar on phones, with icons that draw themselves as you switch tabs.",
      "Write sits in the middle for everyone, and the bar tucks away while you read.",
    ],
  },
  {
    date: "2026-11-13",
    title: "The first line",
    art: "welcome",
    line: "It started, as every story does, with a single line and a question.",
    changes: [
      "Stories that grow one line at a time, where any line can branch.",
      "Votes that lift the best paths, a tree map of every branch, and full-story reading.",
      "Invite-only writing, plans, approvals and a dashboard for authors and admins.",
    ],
  },
];
