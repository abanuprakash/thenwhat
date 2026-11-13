"use client";
import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { SnappedThread, TangledBranch } from "@/components/Illustrations";

/**
 * Small notes that slide up from the bottom (above the phone nav) when something didn't work and
 * there's no form to show it next to: a vote, a follow, a page that couldn't load.
 *
 *   toast({ title: "Your vote didn't land", body: "...", art: "offline", action: { label: "Try again", run } })
 *
 * One note at a time (the newest replaces the last), gone after 7 seconds or when dismissed.
 * Announced to screen readers (role="alert"). Never used for success: success shows in place.
 */

type Art = "offline" | "error";
export type ToastInput = { title: string; body?: ReactNode; art?: Art; action?: { label: string; run: () => void } };
type ToastItem = ToastInput & { id: number };

let current: ToastItem | null = null;
let nextId = 1;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function toast(input: ToastInput) {
  current = { ...input, id: nextId++ };
  emit();
}
export function dismissToast() {
  current = null;
  emit();
}

function useCurrent() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => current,
    () => null,
  );
}

export function Toaster() {
  const item = useCurrent();
  // Which note is on its way out (by id), so a new note always arrives fresh.
  const [leavingId, setLeavingId] = useState<number | null>(null);
  const leaving = !!item && leavingId === item.id;

  useEffect(() => {
    if (!item) return;
    const t = setTimeout(() => setLeavingId(item.id), 7000);
    return () => clearTimeout(t);
  }, [item]);

  if (!item) return null;
  return (
    <div className="toast-wrap" aria-live="assertive">
      <div
        key={item.id}
        role="alert"
        className="toast"
        data-leaving={leaving || undefined}
        onAnimationEnd={(e) => leaving && e.animationName === "sb-toast-out" && dismissToast()}
      >
        <span className="toast-art" aria-hidden="true">
          {item.art === "error" ? <TangledBranch size={40} /> : <SnappedThread size={40} />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-serif text-[15px] font-semibold leading-snug text-ink">{item.title}</p>
          {item.body && <p className="mt-[2px] text-[13px] leading-relaxed text-muted">{item.body}</p>}
          {item.action && (
            <button
              type="button"
              className="mt-2 text-[13px] font-semibold text-gold hover:text-gold-dark"
              onClick={() => {
                const run = item.action!.run;
                dismissToast();
                run();
              }}
            >
              {item.action.label}
            </button>
          )}
        </div>
        <button type="button" className="toast-close" aria-label="Dismiss" onClick={() => setLeavingId(item.id)}>
          <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
            <path d="M2.5 2.5l7 7M9.5 2.5l-7 7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}
