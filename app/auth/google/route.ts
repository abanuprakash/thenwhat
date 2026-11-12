import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import { clientIp, limit, sameOrigin } from "@/lib/security";
import { safeNextPath } from "@/lib/sanitize";

/** Starts Google sign-in from the server (PKCE), so the browser never talks to Supabase directly. */
export async function POST(request: Request) {
  if (!(await sameOrigin(request))) return new NextResponse("Forbidden", { status: 403 });
  const form = await request.formData();
  const next = safeNextPath(form.get("next"));
  if (!(await limit("loginPerIp", await clientIp()))) {
    return NextResponse.redirect(`${env.siteUrl}/login?error=busy&next=${encodeURIComponent(next)}`, 303);
  }
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${env.siteUrl}/auth/callback?next=${encodeURIComponent(next)}`,
      skipBrowserRedirect: true,
    },
  });
  if (error || !data.url) {
    console.error("google sign-in", error?.message);
    return NextResponse.redirect(`${env.siteUrl}/login?error=google&next=${encodeURIComponent(next)}`, 303);
  }
  return NextResponse.redirect(data.url, 303);
}
