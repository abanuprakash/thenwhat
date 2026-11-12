import "server-only";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

/** The visitor's IP as seen by Vercel (falls back to "unknown" locally). */
export async function clientIp(): Promise<string> {
  const h = await headers();
  return (h.get("x-real-ip") ?? h.get("x-forwarded-for")?.split(",")[0] ?? "unknown").trim().slice(0, 64);
}

/**
 * Fixed-window rate limit stored in Postgres (check_rate_limit).
 * Returns true when the action is allowed. Fails closed if the check itself errors.
 */
export async function rateLimit(key: string, max: number, windowSeconds: number): Promise<boolean> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("check_rate_limit", {
    p_key: key.slice(0, 200),
    p_max: max,
    p_window_seconds: windowSeconds,
  });
  if (error) {
    console.error("rate limit check failed", error.message);
    return false;
  }
  return data === true;
}

/** Common limits, so the numbers live in one place. [max, window in seconds] */
export const LIMITS = {
  loginPerIp: [10, 3600],
  loginPerEmail: [5, 3600],
  votePerUser: [120, 60],
  followPerUser: [60, 60],
  reportPerUser: [20, 3600],
  requestPerUser: [10, 3600],
  profilePerUser: [30, 3600],
  avatarPerUser: [10, 3600],
  handleCheckPerIp: [60, 60],
  invitePerUser: [20, 3600],
  acceptInvitePerIp: [20, 3600],
  reviewPerUser: [300, 3600],
  adminPerUser: [300, 3600],
  pollPerIp: [240, 60],
} as const satisfies Record<string, readonly [number, number]>;

export async function limit(name: keyof typeof LIMITS, subject: string): Promise<boolean> {
  const [max, windowSeconds] = LIMITS[name];
  return rateLimit(`${name}:${subject}`, max, windowSeconds);
}

/**
 * Cheap bot filter for forms: a hidden "website" field humans never fill, and a minimum
 * time between the form appearing and being sent.
 */
export function looksLikeBot(formData: FormData, minMs = 1500): boolean {
  const trap = formData.get("website");
  if (typeof trap === "string" && trap.length > 0) return true;
  const shown = Number(formData.get("_t"));
  if (Number.isFinite(shown) && shown > 0 && Date.now() - shown < minMs) return true;
  return false;
}

/** For route handlers that change state: the request must come from our own site. */
export async function sameOrigin(request: Request): Promise<boolean> {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (!origin || !host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export const TOO_MANY = "You're doing that a lot. Wait a little and try again.";
