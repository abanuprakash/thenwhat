import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { normalizeSupabaseUrl } from "@/lib/supabase-url";
import { VIEWER_PROFILE_COLUMNS } from "@/lib/types";
import { VIEWER_HEADER, encodeViewer } from "@/lib/viewer-header";

// Pages only verified authors (or admins) may open.
const AUTHOR_PATHS = ["/write", "/edit", "/new", "/invites", "/dashboard"];
// Pages only admins may open (checked first, so these win over AUTHOR_PATHS).
const ADMIN_PATHS = ["/admin", "/dashboard/users", "/dashboard/reports", "/dashboard/settings", "/dashboard/plans"];
// Pages that need any signed-in user.
const SIGNED_IN_PATHS = ["/me", "/welcome"];
// Signed-in people who haven't picked a handle yet can still reach these.
const ONBOARDING_EXEMPT = ["/welcome", "/auth", "/api", "/login", "/pricing", "/about", "/guide", "/privacy", "/terms", "/changelog"];

const startsWithAny = (path: string, list: string[]) => list.some((p) => path === p || path.startsWith(p + "/"));

const TURNSTILE = "https://challenges.cloudflare.com";

/**
 * Content Security Policy with a fresh nonce per request. The browser may only connect to our
 * own domain (plus Cloudflare's bot check, if switched on): it never talks to the database.
 */
function buildCsp(nonce: string, https: boolean, supabaseOrigin: string) {
  const dev = process.env.NODE_ENV === "development";
  const turnstile = Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY);
  return [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${dev ? " 'unsafe-eval'" : ""}`,
    `style-src 'self' 'unsafe-inline'`,
    `font-src 'self'`,
    `img-src 'self' data: blob: https://lh3.googleusercontent.com`,
    `connect-src 'self'${turnstile ? ` ${TURNSTILE}` : ""}`,
    `frame-src ${turnstile ? TURNSTILE : "'none'"}`,
    `frame-ancestors 'none'`,
    // Google sign-in posts to our server, which redirects to Supabase, which redirects to Google.
    // Browsers check every hop of a form's redirects against form-action, so both must be listed.
    `form-action 'self'${supabaseOrigin ? ` ${supabaseOrigin}` : ""} https://accounts.google.com`,
    `base-uri 'self'`,
    `object-src 'none'`,
    `worker-src 'self' blob:`,
    https ? "upgrade-insecure-requests" : "",
  ]
    .filter(Boolean)
    .join("; ");
}

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // We never use Next's image optimiser; switch its endpoint off entirely.
  if (path.startsWith("/_next/image")) return new NextResponse(null, { status: 404 });

  const url = normalizeSupabaseUrl(process.env.SUPABASE_URL);
  const key = (process.env.SUPABASE_ANON_KEY ?? "").trim().replace(/^["']|["']$/g, "");

  const nonce = btoa(crypto.randomUUID());
  const csp = buildCsp(nonce, request.nextUrl.protocol === "https:", url);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.delete(VIEWER_HEADER); // only this middleware may set it
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const next = () => {
    const res = NextResponse.next({ request: { headers: requestHeaders } });
    res.headers.set("Content-Security-Policy", csp);
    return res;
  };
  let response = next();
  const redirect = (to: URL) => {
    const res = NextResponse.redirect(to);
    res.headers.set("Content-Security-Policy", csp);
    response.cookies.getAll().forEach((c) => res.cookies.set(c));
    return res;
  };

  if (!url || !key) return response; // not configured yet: the app shows setup help

  const supabase = createServerClient(url, key, {
    cookieOptions,
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = next();
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, { ...options, ...cookieOptions }));
      },
    },
  });

  // Verifies the session with Supabase Auth (not just the cookie) and refreshes it.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const needsAdmin = startsWithAny(path, ADMIN_PATHS);
  const needsAuthor = !needsAdmin && startsWithAny(path, AUTHOR_PATHS);
  const needsUser = needsAuthor || needsAdmin || startsWithAny(path, SIGNED_IN_PATHS);

  if (needsUser && !user) {
    const login = request.nextUrl.clone();
    login.pathname = "/login";
    login.search = `?next=${encodeURIComponent(path + request.nextUrl.search)}`;
    return redirect(login);
  }

  // Page loads and prefetches: pass who this is to the page, so it doesn't check again.
  const passViewer = request.method === "GET" || request.method === "HEAD";
  const handOver = (viewer: Parameters<typeof encodeViewer>[0]) => {
    if (!passViewer) return;
    requestHeaders.set(VIEWER_HEADER, encodeViewer(viewer));
    const fresh = next(); // the request headers are captured when the response is created
    response.cookies.getAll().forEach((c) => fresh.cookies.set(c));
    response = fresh;
  };

  if (!user) handOver(null);

  if (user) {
    const { data: profile } = await supabase.from("profiles").select(VIEWER_PROFILE_COLUMNS).eq("id", user.id).single();
    handOver(profile ? { id: user.id, email: user.email ?? null, profile } : null);

    // First sign-in: choose a name and handle before anything else.
    if (profile && !profile.onboarded && !startsWithAny(path, ONBOARDING_EXEMPT)) {
      const welcome = request.nextUrl.clone();
      welcome.pathname = "/welcome";
      welcome.search = `?next=${encodeURIComponent(path + request.nextUrl.search)}`;
      return redirect(welcome);
    }

    if (needsAuthor || needsAdmin) {
      const role = profile?.role;
      const allowed = needsAdmin ? role === "admin" : role === "author" || role === "admin";
      if (!allowed) {
        const dest = request.nextUrl.clone();
        dest.search = "";
        dest.pathname = role === "author" ? "/dashboard" : "/become-author";
        return redirect(dest);
      }
    }
  }

  // Signed-in pages and API answers mustn't be stored by shared caches.
  if (user || path.startsWith("/api/")) response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export const config = {
  // Runs on every page, API route and prefetch (prefetches included on purpose, so no
  // request can reach a page without passing the checks above). Skipped:
  // - Vercel's own analytics endpoints (/_vercel/insights/*): they never reach the app's pages.
  // - The live-update check (/api/stories/<id>/version): a public answer with no session, cached
  //   for a second at Vercel's CDN and shared by everyone reading that story. It does its own
  //   checks (id format, rate limit) and only reads as a guest, so the middleware adds nothing,
  //   and skipping it halves what each check costs.
  matcher: ["/((?!_next/static|_vercel/|favicon.ico|icon.svg|media/|api/stories/[^/]+/version$).*)"],
};
