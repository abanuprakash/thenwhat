"use client";
import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { TourArt, type ArtName } from "@/components/TourArt";

/**
 * A small (i) beside a label that explains it: a card with a drawing, a title and a sentence or two.
 * - Mouse: shows on hover, and stays while you move onto the card. Keyboard: shows on focus.
 *   Touch: tap to open, tap again or anywhere else to close. Esc always closes.
 * - Screen readers hear the explanation as the button's description (WAI tooltip pattern).
 * Keep the words short and true to what the app does; the drawing is decoration.
 */
export function InfoTip({ title, art = "info", children, label }: { title: string; art?: ArtName; children: ReactNode; label?: string }) {
  const id = useId();
  const btn = useRef<HTMLButtonElement>(null);
  const card = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [pos, setPos] = useState<{ left: number; top?: number; bottom?: number } | null>(null);
  const [pinned, setPinned] = useState(false);

  const show = useCallback(() => {
    clearTimeout(timer.current);
    const r = btn.current?.getBoundingClientRect();
    if (!r) return;
    const w = Math.min(280, window.innerWidth - 24);
    const left = Math.min(Math.max(12, r.left + r.width / 2 - w / 2), window.innerWidth - w - 12);
    // Below if there's room, otherwise above.
    setPos(r.bottom + 170 < window.innerHeight ? { left, top: r.bottom + 8 } : { left, bottom: window.innerHeight - r.top + 8 });
  }, []);
  const hide = useCallback(() => {
    clearTimeout(timer.current);
    setPos(null);
    setPinned(false);
  }, []);
  const hideSoon = () => {
    if (pinned) return;
    clearTimeout(timer.current);
    timer.current = setTimeout(hide, 140);
  };

  // While open: Esc, a tap elsewhere, or scrolling closes it.
  useEffect(() => {
    if (!pos) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && hide();
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!btn.current?.contains(t) && !card.current?.contains(t)) hide();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    window.addEventListener("scroll", hide, { passive: true });
    window.addEventListener("resize", hide);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
      window.removeEventListener("scroll", hide);
      window.removeEventListener("resize", hide);
    };
  }, [pos, hide]);

  useEffect(() => () => clearTimeout(timer.current), []);

  return (
    <>
      <button
        ref={btn}
        type="button"
        aria-label={`About ${label ?? title.toLowerCase()}`}
        aria-describedby={pos ? id : undefined}
        aria-expanded={Boolean(pos)}
        data-tip
        onPointerEnter={(e) => {
          if (e.pointerType !== "mouse") return;
          clearTimeout(timer.current);
          timer.current = setTimeout(show, 120);
        }}
        onPointerLeave={(e) => e.pointerType === "mouse" && hideSoon()}
        onFocus={show}
        onBlur={() => !pinned && hideSoon()}
        onClick={() => {
          if (pos && pinned) return hide();
          setPinned(true);
          show();
        }}
        className="press relative -my-1 inline-flex h-6 w-6 flex-none items-center justify-center rounded-full align-middle text-faint transition-colors duration-200 hover:text-gold aria-expanded:text-gold"
      >
        <svg width="15" height="15" viewBox="0 0 16 16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="8" cy="8" r="6.6" />
          <path d="M8 7.2v4" strokeLinecap="round" />
          <circle cx="8" cy="4.9" r="0.6" fill="currentColor" stroke="none" />
        </svg>
      </button>
      {pos &&
        createPortal(
          <div
            ref={card}
            id={id}
            role="tooltip"
            className="tip-card normal-case tracking-normal"
            style={pos}
            onPointerEnter={() => clearTimeout(timer.current)}
            onPointerLeave={(e) => e.pointerType === "mouse" && hideSoon()}
          >
            <div className="flex gap-3 p-[14px]">
              <TourArt name={art} size={38} />
              <div className="min-w-0">
                <p className="text-[13px] font-semibold leading-snug text-ink">{title}</p>
                <div className="mt-1 text-xs font-normal leading-relaxed text-muted">{children}</div>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
