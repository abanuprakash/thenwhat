"use client";
import { Analytics, type BeforeSendEvent } from "@vercel/analytics/next";

/**
 * Vercel Web Analytics (cookieless page views). The script is served from our own domain
 * (/_vercel/insights/*), so the CSP needs nothing new: it's added by a trusted script
 * ('strict-dynamic') and reports to 'self'.
 *
 * Before anything is sent:
 * - sign-in and sign-out URLs are skipped entirely (/auth/callback carries the one-time login code)
 * - invite links are reported as /invite/:token, so a working invite never leaves the browser
 * - query strings and fragments are dropped (?next=, ?at= and the like stay private)
 */
function scrub(event: BeforeSendEvent): BeforeSendEvent | null {
  const url = new URL(event.url, window.location.origin);
  if (url.pathname.startsWith("/auth/")) return null;
  if (url.pathname.startsWith("/invite/")) url.pathname = "/invite/:token";
  url.search = "";
  url.hash = "";
  return { ...event, url: url.toString() };
}

export function VercelAnalytics() {
  return <Analytics beforeSend={scrub} />;
}
