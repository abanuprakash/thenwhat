"use client";
import { useEffect, useState } from "react";
import { RejoinedThread, SnappedThread } from "@/components/Illustrations";
import { toast } from "@/components/Toast";

/**
 * Watches the connection.
 * - Offline: a small note slides in under the header ("The thread snapped"), and stays while you're offline.
 * - Back online: it changes to "Back on the thread" with the thread tying itself back together, then leaves.
 * - While offline, tapping a link to another page doesn't throw you onto the browser's error page:
 *   the page stays put and a note explains. Reading what's already on screen keeps working.
 */
export function ConnectionNotice() {
  const [state, setState] = useState<"online" | "offline" | "back">("online");

  useEffect(() => {
    if (!navigator.onLine) setState("offline");
    let t: ReturnType<typeof setTimeout>;
    const off = () => {
      clearTimeout(t);
      setState("offline");
    };
    const on = () => {
      setState("back");
      t = setTimeout(() => setState("online"), 3200);
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

  if (state === "online") return null;
  const back = state === "back";
  return (
    <div className="conn-wrap" role="status" aria-live="polite">
      <div key={state} className="conn" data-back={back || undefined}>
        {back ? <RejoinedThread size={34} /> : <SnappedThread size={34} />}
        <div className="min-w-0">
          <p className="font-serif text-[14px] font-semibold leading-snug text-ink">{back ? "Back on the thread" : "The thread snapped"}</p>
          <p className="text-[12px] leading-snug text-muted">
            {back ? "You're online again. Everything works as usual." : "You're offline. Keep reading what's here; saving waits for a connection."}
          </p>
        </div>
      </div>
    </div>
  );
}
