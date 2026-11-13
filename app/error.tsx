"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { SnappedThread, TangledBranch } from "@/components/Illustrations";

/**
 * When a page fails to load or render. If the browser is offline, it says so (and offers to try
 * again once the connection is back); otherwise it's our fault, and it says that too.
 * The reference code (Next's error digest) lets us find the matching server log.
 */
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  return (
    <div className="flex min-h-[calc(100dvh-58px)] items-center justify-center px-4 py-12 mobile:min-h-[calc(100dvh-58px-84px)]">
      <div className="animate-page w-full max-w-[440px] text-center">
        <div className="mx-auto mb-5 flex h-[104px] w-[104px] items-center justify-center rounded-full bg-sand">
          {offline ? <SnappedThread size={72} /> : <TangledBranch size={72} />}
        </div>
        <p className="eyebrow mb-2">{offline ? "You're offline" : "Something broke"}</p>
        <h1 className="font-serif text-[26px] font-semibold leading-tight text-ink">
          {offline ? "This page is out of reach" : "This page lost its thread"}
          <span className="text-gold">.</span>
        </h1>
        <p className="mx-auto mt-2 max-w-[360px] text-sm leading-relaxed text-muted">
          {offline
            ? "We couldn't load it without a connection. Once you're back online, try again and it'll pick up where you were."
            : "Something went wrong on our side while loading it. Then what? Try again, and if it keeps happening, head back to the stories."}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button type="button" className="btn-primary" onClick={reset} disabled={offline}>
            {offline ? "Waiting for a connection" : "Try again"}
          </button>
          <Link href="/" className="btn-secondary">
            Back to stories
          </Link>
        </div>
        {error.digest && !offline && <p className="mt-6 text-[11px] text-faint">Reference: {error.digest}</p>}
      </div>
    </div>
  );
}
