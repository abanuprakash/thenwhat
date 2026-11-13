import { NextResponse } from "next/server";
import { createPublicClient } from "@/lib/supabase/public";
import { clientIp, limit } from "@/lib/security";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Poll = { version: number; live_updates: boolean; poll_seconds: number };

/** Errors are never cached: a "slow down" belongs to one visitor, a missing story may appear. */
const noStore = { "Cache-Control": "private, no-store" };

/**
 * Shared for one second at Vercel's CDN, so everyone reading the same story shares one
 * answer: cost grows with stories open, not with readers. Browsers don't keep it.
 * (Vercel-CDN-Cache-Control applies only to Vercel's CDN and is stripped before the browser.)
 */
const sharedForASecond = {
  "Cache-Control": "public, max-age=0, must-revalidate",
  "Vercel-CDN-Cache-Control": "max-age=1",
};

/**
 * A story's change counter, for the reading page's live updates. Open pages call this
 * (through our own server) instead of holding a connection to the database.
 * - Public: it reads as a guest with no cookies, so a cached answer carries no one's session.
 *   The middleware skips this path (see its matcher).
 * - The counter moves when lines change (new, approved, edited, hidden), not on votes.
 * - The answer carries the current setting from Dashboard → Settings, so open pages
 *   slow down, speed up or stop as soon as an admin changes it:
 *     { v: 12, every: 1 }      check again in 1 second
 *     { v: 12, every: null }   live updates are off: stop checking
 */
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) return NextResponse.json({ error: "not found" }, { status: 404, headers: noStore });
  if (!(await limit("pollPerIp", await clientIp(), { asGuest: true }))) return NextResponse.json({ error: "slow down" }, { status: 429, headers: noStore });
  const { data } = await createPublicClient().rpc("story_poll", { p_story: id }).maybeSingle();
  const row = data as Poll | null;
  if (!row) return NextResponse.json({ error: "not found" }, { status: 404, headers: noStore });
  return NextResponse.json({ v: row.version, every: row.live_updates ? row.poll_seconds : null }, { headers: sharedForASecond });
}
