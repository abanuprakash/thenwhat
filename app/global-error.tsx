"use client";
import { sans, serif } from "./fonts";
import "./globals.css";
import { TangledBranch } from "@/components/Illustrations";

/**
 * The last resort: shown if the root layout itself fails, so it brings its own <html> and <body>.
 * It can't rely on the header, fonts or data, only on the stylesheet.
 */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en" className={`${serif.variable} ${sans.variable}`}>
      <body className="flex min-h-screen items-center justify-center bg-paper px-4 font-sans text-ink">
        <main className="w-full max-w-[440px] text-center">
          <div className="mx-auto mb-5 flex h-[104px] w-[104px] items-center justify-center rounded-full bg-sand">
            <TangledBranch size={72} />
          </div>
          <p className="eyebrow mb-2">Then What</p>
          <h1 className="font-serif text-[26px] font-semibold leading-tight">
            The whole story lost its thread<span className="text-gold">.</span>
          </h1>
          <p className="mx-auto mt-2 max-w-[360px] text-sm leading-relaxed text-muted">
            Something went wrong on our side before the page could load. Try again in a moment.
          </p>
          <div className="mt-6 flex justify-center gap-2">
            <button type="button" className="btn-primary" onClick={reset}>
              Try again
            </button>
            {/* A plain link on purpose: the app's router may be the thing that broke. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="/" className="btn-secondary">
              Back to stories
            </a>
          </div>
          {error.digest && <p className="mt-6 text-[11px] text-faint">Reference: {error.digest}</p>}
        </main>
      </body>
    </html>
  );
}
