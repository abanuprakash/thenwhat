"use client";
import { startTransition, useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Live updates for the reading page: while this story is open and the tab is visible, it asks
 * our server every `seconds` whether the story changed, and re-renders the page if so.
 * - Rendered only on the reading page, and only when live updates are on (Dashboard → Settings).
 * - Stops while the tab is hidden; checks once straight away when it's shown again.
 * - Never sends a check while the previous one is still waiting.
 * - Follows the setting live: each answer says how long to wait next, or to stop.
 * - If the server says "slow down" (429), it waits twice as long, up to a minute.
 * No database connection from the browser.
 */
export function LiveRefresh({ storyId, seconds }: { storyId: string; seconds: number }) {
  const router = useRouter();

  useEffect(() => {
    let stopped = false;
    let waiting = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let last: number | null = null;
    let every = Math.max(1, seconds) * 1000;

    const visible = () => document.visibilityState === "visible";
    const schedule = () => {
      clearTimeout(timer);
      if (!stopped && visible()) timer = setTimeout(check, every);
    };

    async function check() {
      if (stopped || waiting || !visible()) return;
      waiting = true;
      try {
        // The answer is shared for a second at Vercel's CDN; the browser itself never keeps it.
        const res = await fetch(`/api/stories/${storyId}/version`);
        if (res.status === 429) {
          every = Math.min(every * 2, 60_000);
        } else if (res.ok) {
          const { v, every: next } = (await res.json()) as { v: number; every: number | null };
          if (next === null) {
            stopped = true; // switched off in the dashboard
            return;
          }
          every = next * 1000;
          if (last !== null && v !== last && !stopped) startTransition(() => router.refresh());
          last = v;
        }
      } catch {
        /* offline or the request was cut off: try again next time */
      } finally {
        waiting = false;
        schedule();
      }
    }

    const onVisibility = () => (visible() ? check() : clearTimeout(timer));
    check();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stopped = true;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [storyId, seconds, router]);

  return null;
}
