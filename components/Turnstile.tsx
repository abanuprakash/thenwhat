"use client";
import Script from "next/script";

/** Cloudflare Turnstile bot check (only shown when a site key is configured). */
export function Turnstile({ siteKey, nonce }: { siteKey: string; nonce: string }) {
  if (!siteKey) return null;
  return (
    <>
      <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" strategy="afterInteractive" nonce={nonce} async defer />
      <div className="cf-turnstile" data-sitekey={siteKey} data-theme="light" data-size="flexible" />
    </>
  );
}
