import "server-only";

/**
 * Server-only settings. The Supabase URL and key never reach the browser: every
 * database call goes through this app's server (the browser only talks to our own domain).
 */
export const env = {
  supabaseUrl: process.env.SUPABASE_URL ?? "",
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY ?? "",
  siteUrl: (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, ""),
  turnstileSiteKey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "",
    // Set EMAIL_SIGNIN=off to offer Google sign-in only (for example before an email sender is set up).
    emailSignIn: process.env.EMAIL_SIGNIN !== "off",
  isProduction: process.env.NODE_ENV === "production",
};

export const isConfigured = Boolean(env.supabaseUrl && env.supabaseAnonKey);
