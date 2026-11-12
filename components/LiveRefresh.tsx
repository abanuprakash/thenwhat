"use client";
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

/**
 * Keeps an open story fresh: every 15 seconds (only while the tab is visible) it asks our
 * server whether the story changed, and re-renders the page if so. No database connection
 * from the browser.
 */
export function LiveRefresh({ storyId }: { storyId: string }) {
  const router = useRouter();
  const last = useRef<number | null>(null);

  useEffect(() => {
    let stopped = false;
    const check = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const res = await fetch(`/api/stories/${storyId}/version`, { cache: "no-store" });
        if (!res.ok) return;
        const { v } = (await res.json()) as { v: number };
        if (last.current !== null && v !== last.current && !stopped) router.refresh();
        last.current = v;
      } catch {
        /* offline: try again next time */
      }
    };
    check();
    const timer = setInterval(check, 15000);
    const onVisible = () => document.visibilityState === "visible" && check();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      stopped = true;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [storyId, router]);

  return null;
}
