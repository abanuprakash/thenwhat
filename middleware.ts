import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Pages only verified authors (or admins) may open.
const AUTHOR_PATHS = ["/write", "/edit", "/new", "/invites", "/dashboard"];
// Pages only admins may open (checked first, so these win over AUTHOR_PATHS).
const ADMIN_PATHS = ["/admin", "/dashboard/users", "/dashboard/reports", "/dashboard/settings", "/dashboard/plans"];
// Pages that need any signed-in user.
const SIGNED_IN_PATHS = ["/me", "/welcome"];
// Signed-in people who haven't picked a handle yet can still reach these.
const ONBOARDING_EXEMPT = ["/welcome", "/auth", "/api", "/login", "/pricing"];

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
    `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`,
    `font-src 'self' https://fonts.gstatic.com`,
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

  const url = process.env.SUPABASE_URL ?? "";
  const key = process.env.SUPABASE_ANON_KEY ?? "";

  const nonce = btoa(crypto.randomUUID());
  const csp = buildCsp(nonce, request.nextUrl.protocol === "https:", url);
  const requestHeaders = new Headers(request.headers);
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

  if (user) {
    const { data: profile } = await supabase.from("profiles").select("role, onboarded").eq("id", user.id).single();

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
  // request can reach a page without passing the checks above).
  matcher: ["/((?!_next/static|favicon.ico|icon.svg|media/).*)"],
};
