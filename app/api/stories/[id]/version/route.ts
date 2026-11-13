import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { clientIp, limit } from "@/lib/security";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Poll = { version: number; live_updates: boolean; poll_seconds: number };

/**
 * A story's change counter, for the reading page's live updates. Open pages call this
 * (through our own server) instead of holding a connection to the database.
 * The answer also carries the current setting from Dashboard → Settings, so open pages
 * slow down, speed up or stop as soon as an admin changes it:
 *   { v: 12, every: 1 }      check again in 1 second
 *   { v: 12, every: null }   live updates are off: stop checking
 */
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const noStore = { "Cache-Control": "private, no-store" };
  if (!UUID.test(id)) return NextResponse.json({ error: "not found" }, { status: 404, headers: noStore });
  if (!(await limit("pollPerIp", await clientIp()))) return NextResponse.json({ error: "slow down" }, { status: 429, headers: noStore });
  const supabase = await createClient();
  const { data } = await supabase.rpc("story_poll", { p_story: id }).maybeSingle();
  const row = data as Poll | null;
  if (!row) return NextResponse.json({ error: "not found" }, { status: 404, headers: noStore });
  return NextResponse.json({ v: row.version, every: row.live_updates ? row.poll_seconds : null }, { headers: noStore });
}
