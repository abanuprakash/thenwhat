"use client";
import { useEffect, useState, useSyncExternalStore } from "react";
import { RejoinedThread, SnappedThread } from "@/components/Illustrations";
import { toast } from "@/components/Toast";

/**
 * Watches the connection.
 * - Offline: a small note slides in under the header ("The thread snapped"), and stays while you're offline.
 * - Back online: it changes to "Back on the thread" with the thread tying itself back together, then leaves.
 * - While offline, tapping a link to another page doesn't throw you onto the browser's error page:
 *   the page stays put and a note explains. Reading what's already on screen keeps working.
 */
const subscribe = (notify: () => void) => {
  window.addEventListener("online", notify);
  window.addEventListener("offline", notify);
  return () => {
    window.removeEventListener("online", notify);
    window.removeEventListener("offline", notify);
  };
};

export function ConnectionNotice() {
  // The browser's own online/offline flag (assumed online while rendering on the server).
  const online = useSyncExternalStore(subscribe, () => navigator.onLine, () => true);
  // Briefly true after the connection comes back, for "Back on the thread".
  const [back, setBack] = useState(false);

  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    const off = () => {
      clearTimeout(t);
      setBack(false);
    };
    const on = () => {
      setBack(true);
      t = setTimeout(() => setBack(false), 3200);
    };
    // Same-site links: stay here while offline instead of loading an error page.
    const onClick = (e: MouseEvent) => {
      if (navigator.onLine || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin || (url.pathname === location.pathname && url.search === location.search)) return;
      e.preventDefault();
      e.stopPropagation();
      toast({ title: "That page is out of reach", body: "You're offline. It'll open once you're back; this page is still here to read.", art: "offline" });
    };
    window.addEventListener("offline", off);
    window.addEventListener("online", on);
    document.addEventListener("click", onClick, true);
    return () => {
      clearTimeout(t);
      window.removeEventListener("offline", off);
      window.removeEventListener("online", on);
      document.removeEventListener("click", onClick, true);
    };
  }, []);

  const state = !online ? "offline" : back ? "back" : "online";
  if (state === "online") return null;
  const isBack = state === "back";
  return (
    <div className="conn-wrap" role="status" aria-live="polite">
      <div key={state} className="conn" data-back={isBack || undefined}>
        {isBack ? <RejoinedThread size={34} /> : <SnappedThread size={34} />}
        <div className="min-w-0">
          <p className="font-serif text-[14px] font-semibold leading-snug text-ink">{isBack ? "Back on the thread" : "The thread snapped"}</p>
          <p className="text-[12px] leading-snug text-muted">
            {isBack ? "You're online again. Everything works as usual." : "You're offline. Keep reading what's here; saving waits for a connection."}
          </p>
        </div>
      </div>
    </div>
  );
}
