"use client";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

/**
 * Vercel Web Analytics (cookieless page views) and Speed Insights (real-user Core Web Vitals).
 * Both scripts are served from our own domain (/_vercel/insights/*, /_vercel/speed-insights/*),
 * so the CSP needs nothing new: they're added by a trusted script ('strict-dynamic') and report
 * to 'self'. Middleware skips /_vercel/*.
 *
 * Before anything is sent, URLs are scrubbed:
 * - sign-in and sign-out URLs are skipped entirely (/auth/callback carries the one-time login code)
 * - invite links are reported as /invite/:token, so a working invite never leaves the browser
 * - query strings and fragments are dropped (?next=, ?at= and the like stay private)
 */
function scrubUrl(href: string): string | null {
  const url = new URL(href, window.location.origin);
  if (url.pathname.startsWith("/auth/")) return null;
  if (url.pathname.startsWith("/invite/")) url.pathname = "/invite/:token";
  url.search = "";
  url.hash = "";
  return url.toString();
}

function scrub<T extends { url: string }>(event: T): T | null {
  const url = scrubUrl(event.url);
  return url ? { ...event, url } : null;
}

export function VercelInsights() {
  return (
    <>
      <Analytics beforeSend={scrub} />
      {/* A sample is enough for Core Web Vitals, and Hobby allows 10,000 data points a month. */}
      <SpeedInsights beforeSend={scrub} sampleRate={0.25} />
    </>
  );
}
