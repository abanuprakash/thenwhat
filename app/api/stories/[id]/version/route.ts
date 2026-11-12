import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { clientIp, limit } from "@/lib/security";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * A story's change counter. Open pages poll this (through our own server) instead of
 * holding a connection to the database, and refresh when it moves.
 */
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const noStore = { "Cache-Control": "private, no-store" };
  if (!UUID.test(id)) return NextResponse.json({ error: "not found" }, { status: 404, headers: noStore });
  if (!(await limit("pollPerIp", await clientIp()))) return NextResponse.json({ error: "slow down" }, { status: 429, headers: noStore });
  const supabase = await createClient();
  const { data } = await supabase.from("stories").select("version").eq("id", id).maybeSingle();
  if (!data) return NextResponse.json({ error: "not found" }, { status: 404, headers: noStore });
  return NextResponse.json({ v: data.version }, { headers: noStore });
}
