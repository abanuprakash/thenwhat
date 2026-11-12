import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import { safeNextPath } from "@/lib/sanitize";

/** Magic links and Google sign-in land here with a one-time code. */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeNextPath(searchParams.get("next"));

  if (code && code.length < 500) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${env.siteUrl}${next}`);
    console.error("auth callback", error.message);
  }
  return NextResponse.redirect(`${env.siteUrl}/login?error=link&next=${encodeURIComponent(next)}`);
}
