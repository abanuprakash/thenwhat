import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import { sameOrigin } from "@/lib/security";

export async function POST(request: Request) {
  if (!(await sameOrigin(request))) return new NextResponse("Forbidden", { status: 403 });
  const supabase = await createClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(`${env.siteUrl}/`, { status: 303 });
}
