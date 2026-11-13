/**
 * Guided tours: one per page, written for each role. Shown once per page and role (signed-in
 * people: profiles.tours_seen; guests: this browser), and any time from the "?" in the header or
 * the Tours panel on your profile.
 *
 * A step points at an element with data-tour="<anchor>" (the first visible one wins, so desktop
 * and phone versions can share a name). A step whose anchor isn't on the page is skipped; a step
 * with no anchor is shown in the middle of the screen. Copy follows docs/DESIGN.md §3.
 */
import type { ArtName } from "@/components/TourArt";

export type TourRole = "guest" | "reader" | "author" | "admin";
export const TOUR_IDS = ["home", "reading", "tree", "write", "new", "dashboard", "settings", "profile"] as const;
export type TourId = (typeof TOUR_IDS)[number];

export type TourStep = {
  anchor?: string;
  art: ArtName;
  title: string;
  body: string;
  /** Leave out to show the step to everyone the tour is for. */
  roles?: TourRole[];
};

export type Tour = {
  id: TourId;
  /** Shown on the tour card and in the Tours panel. */
  name: string;
  /** One line for the Tours panel. */
  about: string;
  roles: TourRole[];
  steps: TourStep[];
};

const SIGNED_IN: TourRole[] = ["reader", "author", "admin"];
const WRITERS: TourRole[] = ["author", "admin"];

export const TOURS: Record<TourId, Tour> = {
  home: {
    id: "home",
    name: "Finding stories",
    about: "The feed, its tabs, and how to join in.",
    roles: ["guest", "reader", "author", "admin"],
    steps: [
      {
        art: "welcome",
        title: "Welcome to Then What",
        body: "Stories here grow one line at a time, and any line can branch. Readers vote, and the best paths rise.",
      },
      {
        anchor: "feed-tabs",
        art: "tabs",
        title: "Pick a shelf",
        body: "Trending is what's moving right now. New is fresh starts, Top is the most loved, and Finished have reached an ending.",
      },
      {
        anchor: "story-card",
        art: "story",
        title: "Open any story",
        body: "Each card shows the opening line and its votes. Tap it to start reading from the first line.",
      },
      {
        anchor: "follow-star",
        art: "star",
        title: "Star the ones you love",
        body: "Starred stories wait for you under Following, so you can come back when they grow.",
        roles: SIGNED_IN,
      },
      {
        anchor: "sign-in",
        art: "key",
        title: "Sign in to join in",
        body: "Reading is open to everyone. Sign in to vote, follow stories and, once you're invited, write.",
        roles: ["guest"],
      },
      {
        anchor: "start-story",
        art: "pen",
        title: "Start a story",
        body: "Write an opening line and see where other authors take it.",
        roles: WRITERS,
      },
      {
        anchor: "your-profile",
        art: "profile",
        title: "Your corner",
        body: "Your karma, followed stories and plan live on your profile, along with every tour.",
        roles: SIGNED_IN,
      },
      {
        anchor: "tour-button",
        art: "compass",
        title: "Lost the thread?",
        body: "Tap the ? any time to replay the tour for the page you're on.",
      },
    ],
  },

  reading: {
    id: "reading",
    name: "Reading a story",
    about: "Lines, branches, votes and your path.",
    roles: ["guest", "reader", "author", "admin"],
    steps: [
      {
        anchor: "current-line",
        art: "line",
        title: "The line you're on",
        body: "A story is a chain of lines, each up to 280 characters. This is where your path has reached.",
      },
      {
        anchor: "line-votes",
        art: "vote",
        title: "Vote it up or down",
        body: "Votes decide which branches rise. Tap the same arrow again to take your vote back.",
        roles: SIGNED_IN,
      },
      {
        anchor: "line-votes",
        art: "vote",
        title: "Readers decide",
        body: "Votes decide which branches rise to the top. Sign in to add yours.",
        roles: ["guest"],
      },
      {
        anchor: "branches",
        art: "branches",
        title: "Then what?",
        body: "Every way the story carries on from here, ranked by readers. Open one to follow that path.",
      },
      {
        anchor: "path",
        art: "path",
        title: "Your path so far",
        body: "Each chip is a line you've passed through. Tap one to go back and try a different branch.",
      },
      {
        anchor: "mini-tree",
        art: "tree",
        title: "See the whole shape",
        body: "How the story has branched so far. The gold dot is you; the full tree map shows everything.",
      },
      {
        anchor: "follow-story",
        art: "star",
        title: "Keep up with it",
        body: "Follow the story and it'll be under Following on the home page whenever it grows.",
        roles: SIGNED_IN,
      },
      {
        anchor: "write-next",
        art: "pen",
        title: "Your turn",
        body: "Add what happens next. On stories that need approval, your line waits for the starter or an admin first.",
        roles: WRITERS,
      },
      {
        anchor: "become-author",
        art: "key",
        title: "Want to write?",
        body: "Writing is by invite. An author can invite you, or see how to become one.",
        roles: ["guest", "reader"],
      },
      {
        anchor: "read-full",
        art: "book",
        title: "Read it in one go",
        body: "Turns this path into continuous prose, from the first line to here.",
      },
    ],
  },

  tree: {
    id: "tree",
    name: "The tree map",
    about: "Every branch of a story at once.",
    roles: ["guest", "reader", "author", "admin"],
    steps: [
      {
        anchor: "tree-canvas",
        art: "tree",
        title: "The whole story at a glance",
        body: "Every card is a line. Drag to move around, scroll or pinch to zoom, and tap a line to read from there.",
      },
      {
        anchor: "tree-legend",
        art: "path",
        title: "Where you've been",
        body: "Gold marks the path you're reading, so you can see the roads you haven't taken.",
      },
      {
        anchor: "tree-controls",
        art: "zoom",
        title: "Lost in the branches?",
        body: "Zoom in and out here, or fit the whole story back on screen.",
      },
    ],
  },

  write: {
    id: "write",
    name: "Writing a line",
    about: "Adding the next line to a story.",
    roles: WRITERS,
    steps: [
      {
        anchor: "so-far",
        art: "path",
        title: "What came before",
        body: "The line you're continuing. Read the path first so yours fits the story.",
      },
      {
        anchor: "line-limits",
        art: "branches",
        title: "Room to grow",
        body: "How many branches this line can still take, and how long the path can get.",
      },
      {
        anchor: "composer",
        art: "pen",
        title: "Then what?",
        body: "Up to 280 characters. End on something that makes the next person wonder.",
      },
      {
        anchor: "char-counter",
        art: "counter",
        title: "Mind the count",
        body: "The counter turns gold in the last 20 characters, so you know when to land it.",
      },
      {
        anchor: "sparks",
        art: "spark",
        title: "Stuck?",
        body: "Get a spark for a nudge. It's a suggestion, not a rule; ask for another if it doesn't fit.",
      },
      {
        anchor: "write-submit",
        art: "send",
        title: "Send it out",
        body: "Your line joins the branches. If the story needs approval, it waits for the starter or an admin.",
      },
    ],
  },

  new: {
    id: "new",
    name: "Starting a story",
    about: "Titles, genres and opening lines.",
    roles: WRITERS,
    steps: [
      {
        anchor: "story-title",
        art: "book",
        title: "Name it",
        body: "A short title readers will know it by.",
      },
      {
        anchor: "story-genre",
        art: "tabs",
        title: "Pick a shelf",
        body: "The genre tells readers what kind of story to expect.",
      },
      {
        anchor: "story-opening",
        art: "line",
        title: "The opening line",
        body: "Everything grows from this. Leave a question hanging and others will want to answer it.",
      },
    ],
  },

  dashboard: {
    id: "dashboard",
    name: "Your dashboard",
    about: "Your stories, reviews, requests and invites.",
    roles: WRITERS,
    steps: [
      {
        art: "dashboard",
        title: "Your dashboard",
        body: "Everything you look after as an author: your stories, lines waiting for you, and requests.",
        roles: ["author"],
      },
      {
        art: "dashboard",
        title: "The admin view",
        body: "Everything on Then What in one place: every story, every person, and the rules they share.",
        roles: ["admin"],
      },
      {
        anchor: "dash-stats",
        art: "gauge",
        title: "At a glance",
        body: "Tap a number to see the list behind it. Anything gold needs your attention.",
      },
      {
        anchor: "dash-nav",
        art: "tabs",
        title: "Find your way around",
        body: "Review holds lines waiting for approval, Requests is people asking for more room, Stories lets you pause or reopen, and Invites brings new authors in.",
      },
      {
        anchor: "dash-admin",
        art: "shield",
        title: "Admin tools",
        body: "Users, plans, reports and site settings. Changes here apply to everyone.",
        roles: ["admin"],
      },
      {
        anchor: "dash-rules",
        art: "branches",
        title: "The house rules",
        body: "How far every story can grow. Each story shows its own limits too.",
      },
    ],
  },

  settings: {
    id: "settings",
    name: "Site settings",
    about: "Story shape, approvals, live updates and fair use.",
    roles: ["admin"],
    steps: [
      {
        anchor: "settings-shape",
        art: "branches",
        title: "How stories grow",
        body: "Branches per line and lines per path, for every story. You can make exceptions on a single story.",
      },
      {
        anchor: "settings-approval",
        art: "check",
        title: "New lines",
        body: "Choose whether new lines appear straight away or wait for the starter or an admin.",
      },
      {
        anchor: "settings-live",
        art: "pulse",
        title: "Live updates",
        body: "How often open stories check for new lines. Faster feels more alive but uses more of the hosting allowance.",
      },
      {
        anchor: "settings-fair",
        art: "gauge",
        title: "Fair use",
        body: "How many lines one person can add in an hour, so nobody floods a story.",
      },
    ],
  },

  profile: {
    id: "profile",
    name: "Your profile",
    about: "Karma, your details, your plan and these tours.",
    roles: SIGNED_IN,
    steps: [
      {
        anchor: "profile-stats",
        art: "spark",
        title: "Your numbers",
        body: "Karma is what your lines have earned in votes. The rest counts what you've started, written and followed.",
      },
      {
        anchor: "profile-edit",
        art: "profile",
        title: "Make it yours",
        body: "Change your name, bio and photo. Your @handle is how people find and mention you.",
      },
      {
        anchor: "profile-plan",
        art: "ticket",
        title: "Your plan",
        body: "What your plan includes. Compare plans on Pricing whenever you like.",
      },
      {
        anchor: "profile-tours",
        art: "compass",
        title: "Tours, any time",
        body: "Replay any tour from here, or bring them all back as you move around.",
      },
    ],
  },
};

/** The key stored when someone has seen a tour: the tour and the role it was written for. */
export function tourKey(id: TourId, role: TourRole) {
  return `${id}@${role}`;
}

/** Steps for this role, in order. */
export function stepsFor(tour: Tour, role: TourRole): TourStep[] {
  return tour.steps.filter((s) => !s.roles || s.roles.includes(role));
}

export function isTourId(value: unknown): value is TourId {
  return typeof value === "string" && (TOUR_IDS as readonly string[]).includes(value);
}
