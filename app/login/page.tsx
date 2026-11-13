import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { LoginForm } from "@/components/LoginForm";
import { env } from "@/lib/env";
import { safeNextPath } from "@/lib/sanitize";

export const metadata: Metadata = { title: "Sign in" };

const ERRORS: Record<string, string> = {
  link: "That sign-in link didn't work. It may have expired, so ask for a new one.",
  google: "Google sign-in didn't go through. Try again; if it keeps happening, wait a minute first.",
  busy: "Too many sign-in attempts from here. Wait a little, then try again.",
};

/** The heading meets people where they were heading when we asked them to sign in. */
function intro(next: string): { title: string; body: string } {
  if (next.startsWith("/invite/"))
    return { title: "Sign in to accept your invite", body: "Someone saved you a seat. Sign in and the invite is yours, ready to write the next line." };
  if (next === "/new" || next.startsWith("/write/") || next.startsWith("/edit/"))
    return { title: "Sign in to write the next line", body: "Writing is by invite. Sign in first; if you've been invited, you can start straight away." };
  if (next.startsWith("/dashboard")) return { title: "Sign in to your dashboard", body: "Your stories, requests and lines waiting for review are on the other side." };
  if (next.includes("tab=following")) return { title: "Sign in to see what you follow", body: "Stories you've starred wait for you here, with their newest branches." };
  if (next.startsWith("/s/")) return { title: "Sign in to join this story", body: "Vote on where it goes, follow it, and come back when it grows." };
  return { title: "Your turn is waiting", body: "Sign in to vote on the best paths, follow the stories you love and, once you're invited, write what happens next." };
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next: rawNext, error } = await searchParams;
  const next = safeNextPath(rawNext);
  const nonce = (await headers()).get("x-nonce") ?? "";
  const { title, body } = intro(next);

  return (
    // Centred in the space between the header and the bottom of the screen (minus the phone nav).
    <div className="flex min-h-[calc(100dvh-58px)] items-center justify-center px-4 py-10 mobile:min-h-[calc(100dvh-58px-84px)]">
      <div className="animate-page w-full max-w-[400px]">
        <div className="card px-6 py-8 desk:px-8">
          <LoginMark />
          <p className="eyebrow mb-2 mt-5 text-center">Welcome to Then What</p>
          <h1 className="text-center font-serif text-[26px] font-semibold leading-tight">
            {title}
            <span className="text-gold">.</span>
          </h1>
          <p className="mx-auto mb-6 mt-2 max-w-[320px] text-center text-sm leading-relaxed text-muted">{body}</p>
          {error && ERRORS[error] && (
            <p role="alert" className="animate-reveal mb-4 rounded-[3px] bg-chip px-3 py-2 text-sm text-ink">
              {ERRORS[error]}
            </p>
          )}
          <LoginForm next={next} turnstileSiteKey={env.turnstileSiteKey} nonce={nonce} emailEnabled={env.emailSignIn} />
          <p className="mt-5 text-center text-xs leading-relaxed text-faint">
            New here? Signing in creates your account. You&apos;ll choose a name and @handle next.
          </p>
        </div>
        <p className="mt-4 px-2 text-center text-[11px] leading-relaxed text-faint">
          We only use Google to confirm it&apos;s you. Your email stays private: it never appears on your profile, and we never post anything.
          By continuing, you agree to our{" "}
          <Link href="/terms" className="font-semibold text-faint underline decoration-black/20 underline-offset-2 hover:text-gold">
            house rules
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="font-semibold text-faint underline decoration-black/20 underline-offset-2 hover:text-gold">
            privacy policy
          </Link>
          .
        </p>
        <p className="mt-3 text-center text-xs">
          <Link href="/" className="font-semibold text-gold hover:text-gold-dark">
            Just looking? Read stories without signing in
          </Link>
        </p>
      </div>
    </div>
  );
}

/** The Then What mark (a question mark whose dot splits into two branches), drawing itself once. */
function LoginMark() {
  return (
    <svg width="48" height="48" viewBox="0 0 32 32" aria-hidden="true" className="login-mark mx-auto block">
      <path
        pathLength={1}
        d="M10.5 11.5c0-3.2 2.5-5.5 5.5-5.5s5.5 2.2 5.5 5.2c0 2.6-1.8 3.8-3.6 4.9-1.2.7-1.9 1.5-1.9 3.1V20"
        fill="none"
        className="lm-draw stroke-gold"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
      <path className="lm-draw stroke-line" style={{ "--d": "520ms" } as React.CSSProperties} pathLength={1} d="M16 20.5 11.8 25" strokeWidth="1.8" strokeLinecap="round" />
      <path className="lm-draw stroke-line" style={{ "--d": "520ms" } as React.CSSProperties} pathLength={1} d="M16 20.5 20.2 25" strokeWidth="1.8" strokeLinecap="round" />
      <circle style={{ "--d": "700ms" } as React.CSSProperties} cx="11.5" cy="25.5" r="2" className="lm-pop fill-gold-soft" />
      <circle style={{ "--d": "780ms" } as React.CSSProperties} cx="20.5" cy="25.5" r="2" className="lm-pop fill-gold-soft" />
    </svg>
  );
}
