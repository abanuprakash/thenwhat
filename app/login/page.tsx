import type { Metadata } from "next";
import { headers } from "next/headers";
import { LoginForm } from "@/components/LoginForm";
import { env } from "@/lib/env";
import { safeNextPath } from "@/lib/sanitize";

export const metadata: Metadata = { title: "Sign in" };

const ERRORS: Record<string, string> = {
  link: "That sign-in link didn't work. It may have expired, so request a new one.",
  google: "Google sign-in didn't work. Try again, or use your email.",
  busy: "Too many sign-in attempts from here. Wait a little and try again.",
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next, error } = await searchParams;
  const nonce = (await headers()).get("x-nonce") ?? "";
  return (
    <div className="mx-auto w-full max-w-[420px] px-4 pb-24 pt-12">
      <h1 className="mb-2 font-serif text-2xl font-semibold">
        Find out what happens next<span className="text-gold">.</span>
      </h1>
      <p className="mb-6 text-sm text-muted">Sign in, or sign up: it&apos;s the same step. You&apos;ll pick a name and handle after.</p>
      {error && ERRORS[error] && (
        <p role="alert" className="mb-4 rounded-[3px] bg-chip px-3 py-2 text-sm text-ink">
          {ERRORS[error]}
        </p>
      )}
      <LoginForm next={safeNextPath(next)} turnstileSiteKey={env.turnstileSiteKey} nonce={nonce} />
    </div>
  );
}
