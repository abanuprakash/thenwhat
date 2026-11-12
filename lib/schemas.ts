import { z } from "zod";
import { GENRES } from "@/lib/types";
import { cleanHandle, cleanText } from "@/lib/sanitize";

/**
 * Every form value is cleaned (lib/sanitize.ts) and then validated here, in the
 * Server Action. The database checks the same rules again with CHECK constraints.
 */
export const LINE_MAX = 280;

const text = (max: number, opts: { min?: number; multiline?: boolean; message?: string } = {}) =>
  z.preprocess(
    (v) => cleanText(v, { multiline: opts.multiline ?? true }),
    z
      .string()
      .min(opts.min ?? 0, opts.message ?? "This can't be empty.")
      .max(max, `Keep it to ${max} characters or fewer.`),
  );

const optionalInt = (min: number, max: number, minMessage: string) =>
  z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? null : Number(v)),
    z.number().int("Use a whole number.").min(min, minMessage).max(max, `Up to ${max}.`).nullable(),
  );

export const lineText = text(LINE_MAX, { min: 1, message: "Write something first." });

// Same rule as the database's handle_is_valid().
export const HANDLE_RULE = /^[a-z0-9][a-z0-9_.]{1,22}[a-z0-9]$/;
export const handleSchema = z.preprocess(
  cleanHandle,
  z
    .string()
    .regex(HANDLE_RULE, "3–24 characters: letters, numbers, dots and underscores, starting and ending with a letter or number.")
    .refine((h) => !/[._]{2}/.test(h), "Dots and underscores can't sit next to each other."),
);

export const uuid = z.string().uuid();

export const writeLineSchema = z.object({ parentId: uuid, text: lineText });
export const editLineSchema = z.object({ lineId: uuid, text: lineText });

export const createStorySchema = z.object({
  title: text(120, { min: 1, multiline: false, message: "Give your story a title." }),
  genre: z.enum(GENRES),
  firstLine: lineText,
});

export const voteSchema = z.object({ lineId: uuid, value: z.union([z.literal(1), z.literal(-1)]) });

export const profileSchema = z.object({
  handle: handleSchema,
  displayName: text(60, { min: 1, multiline: false, message: "Add your name." }),
  bio: text(280),
});

export const onboardingSchema = z.object({
  handle: handleSchema,
  displayName: text(60, { min: 1, multiline: false, message: "Add your name." }),
});

export const emailSchema = z.preprocess(
  (v) => (typeof v === "string" ? v.trim().toLowerCase() : v),
  z.string().email("Enter a valid email address.").max(254),
);

export const reportSchema = z.object({ lineId: uuid, reason: text(280) });

export const settingsSchema = z.object({
  maxBranches: optionalInt(1, 50, "At least 1 branch."),
  maxDepth: optionalInt(2, 200, "At least 2 lines."),
  linesPerHour: z.coerce.number().int("Use a whole number.").min(1).max(500),
  autoApprove: z.enum(["yes", "no"]),
});

export const storyLimitsSchema = z.object({
  storyId: uuid,
  maxBranches: optionalInt(1, 50, "At least 1 branch."),
  maxDepth: optionalInt(2, 200, "At least 2 lines."),
});

export const moderationSchema = z.object({ storyId: uuid, mode: z.enum(["inherit", "auto", "review"]) });

export const limitRequestSchema = z.object({
  lineId: uuid,
  kind: z.enum(["more_branches", "more_depth"]),
  message: text(500, { min: 10, message: "Tell the reviewer a little more (at least 10 characters)." }),
});

export const decisionSchema = z.object({
  requestId: uuid,
  approve: z.enum(["yes", "no"]),
  granted: z.coerce.number().int().min(1, "Grant at least 1.").max(20, "Up to 20 at a time.").optional(),
  note: text(280),
});

export const lineReviewSchema = z.object({ lineId: uuid, approve: z.enum(["yes", "no"]), note: text(280) });

export const storyStatusSchema = z.object({
  storyId: uuid,
  status: z.enum(["active", "inactive"]),
  reason: text(280, { multiline: false }),
});

export const FEATURES = [
  "vote",
  "follow",
  "report",
  "write_lines",
  "edit_lines",
  "start_stories",
  "invite",
  "request_more",
  "review_requests",
  "story_rules",
  "approvals",
] as const;
export type Feature = (typeof FEATURES)[number];

export const planIdSchema = z.string().regex(/^[a-z][a-z0-9_]{1,29}$/);

export const userPlanSchema = z.object({
  handle: handleSchema,
  plan: planIdSchema,
  expiresAt: z.preprocess(
    (v) => (v === "" || v == null ? null : v),
    z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date.").nullable(),
  ),
});
