"use client";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { markTourSeen } from "@/app/account-actions";
import { safely } from "@/lib/client-action";
import { TOURS, isTourId, stepsFor, tourKey, type TourId, type TourRole, type TourStep } from "@/lib/tours";
import { TourArt } from "@/components/TourArt";

/*
 * Guided tours.
 * - A page says which tour it has with <PageTour id="…" />.
 * - <TourHost> (in the root layout) starts it once per page and role, the first time you arrive;
 *   <TourButton> (the "?" in the header) starts it again whenever you like; a link with ?tour=<id>
 *   starts it on arrival (the Tours panel on your profile uses these).
 * - Each step lights up one element (data-tour="<anchor>") and explains it in a card: a floating card
 *   on wide screens, a bottom sheet on phones. Steps whose element isn't on the page are skipped.
 * - Keyboard: → / Enter next, ← back, Esc closes. Focus stays in the card and returns afterwards.
 * - Seen tours: signed in, in your profile (any device); guests, in this browser.
 * - Automated browsers (tests, crawlers) don't get tours on their own.
 */

// ── Which tour this page has (set by <PageTour>) ─────────────────────────
let pageTour: TourId | null = null;
const subs = new Set<() => void>();
const setPage = (id: TourId | null) => {
  pageTour = id;
  subs.forEach((f) => f());
};
const subscribe = (f: () => void) => {
  subs.add(f);
  return () => subs.delete(f);
};
const usePageTour = () => useSyncExternalStore(subscribe, () => pageTour, () => null);

const START = "tw:tour-start";
const RESET = "tw:tours-reset";
const GUEST_KEY = "tw-tours-seen";

/** Start this page's tour (or the one named). */
export function startTour(id?: TourId) {
  window.dispatchEvent(new CustomEvent(START, { detail: id ?? pageTour }));
}
/** After "Show all tours again": forget what this browser and page remember. */
export function forgetTours() {
  try {
    localStorage.removeItem(GUEST_KEY);
  } catch {}
  window.dispatchEvent(new Event(RESET));
}

/** Put on a page that has a tour. Renders nothing. */
export function PageTour({ id }: { id: TourId }) {
  useEffect(() => {
    setPage(id);
    return () => {
      if (pageTour === id) setPage(null);
    };
  }, [id]);
  return null;
}

/** The "?" in the header: replays this page's tour. Hidden on pages without one. */
export function TourButton() {
  const id = usePageTour();
  if (!id) return null;
  return (
    <button
      type="button"
      data-tour="tour-button"
      onClick={() => startTour()}
      aria-label={`Take the tour: ${TOURS[id].name}`}
      title="Take the tour of this page"
      className="press flex h-9 w-9 items-center justify-center rounded-full border border-black/[.1] bg-white text-[15px] font-semibold text-gold transition-colors duration-200 hover:border-gold-edge hover:text-gold-dark"
    >
      <span aria-hidden="true" className="font-serif">?</span>
    </button>
  );
}

/** A quiet "Take the tour" button for pages that want one in view (settings). */
export function TourLink({ label = "Take the tour" }: { label?: string }) {
  const id = usePageTour();
  if (!id) return null;
  return (
    <button type="button" onClick={() => startTour()} className="press inline-flex items-center gap-2 rounded-full border border-gold-edge bg-white py-1 pl-1 pr-3 text-xs font-semibold text-gold hover:text-gold-dark">
      <TourArt name="compass" size={26} />
      {label}
    </button>
  );
}

// ── Host ─────────────────────────────────────────────────────────────────
type Running = { id: TourId; steps: TourStep[]; index: number };

const readGuestSeen = (): string[] => {
  try {
    const v = JSON.parse(localStorage.getItem(GUEST_KEY) ?? "[]");
    return Array.isArray(v) ? v.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
};

/** Robots and test runners don't get tours on their own (they'd block the page). */
const automated = () => {
  try {
    if (localStorage.getItem("tw-tours-test") === "1") return false;
  } catch {}
  return typeof navigator !== "undefined" && navigator.webdriver === true;
};

export function TourHost({ role, seen }: { role: TourRole; seen: string[] | null }) {
  const page = usePageTour();
  const [running, setRunning] = useState<Running | null>(null);
  const seenRef = useRef<Set<string>>(new Set(seen ?? []));
  const signedIn = seen !== null;

  // A fresh page load brings the stored list (it may have changed on another device).
  useEffect(() => {
    seenRef.current = new Set(seen ?? readGuestSeen());
  }, [seen]);

  const remember = useCallback(
    (id: TourId) => {
      const key = tourKey(id, role);
      if (seenRef.current.has(key)) return;
      seenRef.current.add(key);
      if (signedIn) {
        void safely(() => markTourSeen(key)); // best effort: if it fails, the tour shows once more
      } else {
        try {
          localStorage.setItem(GUEST_KEY, JSON.stringify([...seenRef.current].slice(-60)));
        } catch {}
      }
    },
    [role, signedIn],
  );

  const begin = useCallback(
    (id: TourId) => {
      const tour = TOURS[id];
      if (!tour.roles.includes(role)) return;
      const steps = stepsFor(tour, role).filter((s) => !s.anchor || findAnchor(s.anchor));
      if (!steps.length) return;
      remember(id);
      setRunning({ id, steps, index: 0 });
    },
    [role, remember],
  );

  // Arriving on a page: ?tour=<id> starts it now; otherwise the first visit starts it after a beat.
  useEffect(() => {
    if (!page) return;
    const asked = new URLSearchParams(window.location.search).get("tour");
    if (asked === page) {
      const url = new URL(window.location.href);
      url.searchParams.delete("tour");
      window.history.replaceState(window.history.state, "", url);
      const t = setTimeout(() => begin(page), 350);
      return () => clearTimeout(t);
    }
    if (seenRef.current.has(tourKey(page, role)) || automated()) return;
    const t = setTimeout(() => {
      if (document.visibilityState !== "visible" || document.querySelector("dialog[open]")) return;
      begin(page);
    }, 900);
    return () => clearTimeout(t);
  }, [page, role, begin]);

  // The "?" button and the Tours panel.
  useEffect(() => {
    const onStart = (e: Event) => {
      const id = (e as CustomEvent).detail;
      if (isTourId(id)) begin(id);
    };
    const onReset = () => {
      seenRef.current = new Set();
    };
    window.addEventListener(START, onStart);
    window.addEventListener(RESET, onReset);
    return () => {
      window.removeEventListener(START, onStart);
      window.removeEventListener(RESET, onReset);
    };
  }, [begin]);

  // Leaving the page ends its tour.
  const active = running && running.id === page ? running : null;
  if (!active) return null;
  return <TourOverlay running={active} onMove={(index) => setRunning({ ...active, index })} onClose={() => setRunning(null)} />;
}

// ── Overlay ──────────────────────────────────────────────────────────────
/** Elements drawn by libraries that don't pass our data-tour attribute through. */
const LIBRARY_ANCHORS: Record<string, string> = { "tree-controls": ".react-flow__controls" };

function findAnchor(name: string): HTMLElement | null {
  const els = document.querySelectorAll<HTMLElement>(
    LIBRARY_ANCHORS[name] ? `[data-tour~="${name}"], ${LIBRARY_ANCHORS[name]}` : `[data-tour~="${name}"]`,
  );
  for (const el of els) {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== "hidden") return el;
  }
  return null;
}

const PAD = 6;

function placeCard(rect: DOMRect | null, h: number): CSSProperties {
  if (typeof window === "undefined" || isPhone()) return {};
  const w = 340;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  if (!rect) return { left: (vw - w) / 2, top: Math.max(24, (vh - h) / 2) };
  const left = Math.min(Math.max(16, rect.left + rect.width / 2 - w / 2), vw - w - 16);
  const below = rect.bottom + PAD + 14;
  const above = rect.top - PAD - 14 - h;
  if (below + h < vh - 16) return { left, top: below };
  if (above > 16) return { left, top: above };
  return { left: Math.min(rect.right + 18, vw - w - 16), top: Math.max(16, Math.min(rect.top, vh - h - 16)) };
}
const isPhone = () => window.matchMedia("(max-width: 760px)").matches;
const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function TourOverlay({ running, onMove, onClose }: { running: Running; onMove: (i: number) => void; onClose: () => void }) {
  const { id, steps, index } = running;
  const step = steps[index];
  const tour = TOURS[id];
  const last = index === steps.length - 1;
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [cardH, setCardH] = useState(220);
  const cardRef = useRef<HTMLDivElement>(null);
  const primaryRef = useRef<HTMLButtonElement>(null);
  const returnTo = useRef<Element | null>(null);

  // Remember where focus was, and give it back when the tour ends.
  useEffect(() => {
    returnTo.current = document.activeElement;
    return () => {
      if (returnTo.current instanceof HTMLElement) returnTo.current.focus({ preventScroll: true });
    };
  }, []);

  // Bring the step's element into view, then follow it while the page scrolls or resizes.
  useLayoutEffect(() => {
    const el = step.anchor ? findAnchor(step.anchor) : null;
    if (!el) {
      const f = requestAnimationFrame(() => setRect(null));
      return () => cancelAnimationFrame(f);
    }
    const r = el.getBoundingClientRect();
    const phone = isPhone();
    const freeBottom = window.innerHeight - (phone ? 300 : 40);
    if (r.top < 72 || r.bottom > freeBottom) {
      const target = window.scrollY + r.top - (phone ? 84 : Math.max(96, window.innerHeight * 0.25));
      window.scrollTo({ top: Math.max(0, target), behavior: reduced() ? "auto" : "smooth" });
    }
    let frame = 0;
    const measure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => setRect(el.getBoundingClientRect()));
    };
    measure();
    // Follow a smooth scroll for its whole length.
    const until = performance.now() + 700;
    const follow = () => {
      setRect(el.getBoundingClientRect());
      if (performance.now() < until) frame = requestAnimationFrame(follow);
    };
    frame = requestAnimationFrame(follow);
    window.addEventListener("scroll", measure, { passive: true });
    window.addEventListener("resize", measure);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", measure);
      window.removeEventListener("resize", measure);
    };
  }, [step]);

  // The card's height, for placing it (it changes with each step's text).
  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;
    const ro = new ResizeObserver(() => setCardH(card.offsetHeight));
    ro.observe(card);
    return () => ro.disconnect();
  }, []);

  // Next to the element on wide screens (below if it fits, else above, else beside); a sheet on phones.
  const cardPos = placeCard(rect, cardH);

  // Focus the main button on each step, so Enter moves on and screen readers hear the new step.
  useEffect(() => {
    primaryRef.current?.focus({ preventScroll: true });
  }, [index]);

  const next = useCallback(() => (last ? onClose() : onMove(index + 1)), [last, onClose, onMove, index]);
  const back = useCallback(() => index > 0 && onMove(index - 1), [index, onMove]);

  // Keyboard: arrows, Esc, and Tab kept inside the card.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        next();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        back();
      } else if (e.key === "Tab" && cardRef.current) {
        const items = [...cardRef.current.querySelectorAll<HTMLElement>("button:not([disabled])")];
        if (!items.length) return;
        const first = items[0];
        const lastItem = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          lastItem.focus();
        } else if (!e.shiftKey && document.activeElement === lastItem) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [next, back, onClose]);

  const titleId = `tour-title-${id}`;
  const bodyId = `tour-body-${id}`;

  return createPortal(
    <>
      {/* Catches clicks so the page underneath stays put during the tour. */}
      <div className="fixed inset-0 z-[59]" aria-hidden="true" />
      {rect ? (
        <div
          key={`spot-${index}`}
          className="tour-spot"
          aria-hidden="true"
          style={{ left: rect.left - PAD, top: rect.top - PAD, width: rect.width + PAD * 2, height: rect.height + PAD * 2 }}
        />
      ) : (
        <div key={`dim-${index}`} className="tour-dim" aria-hidden="true" />
      )}
      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={bodyId}
        className="tour-card"
        style={cardPos}
        data-testid="tour"
      >
        <div key={index} className="tour-step">
          <div className="flex items-start gap-4">
            <TourArt name={step.art} size={56} />
            <div className="min-w-0 flex-1">
              <p className="eyebrow mb-1">
                {tour.name} · {index + 1} of {steps.length}
              </p>
              <h2 id={titleId} className="text-[15px] font-semibold leading-snug text-ink">
                {step.title}
              </h2>
              <p id={bodyId} className="mt-1 text-[13.5px] leading-relaxed text-muted">
                {step.body}
              </p>
            </div>
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-[5px]" aria-hidden="true">
            {steps.map((s, i) => (
              <span
                key={i}
                className={`h-[6px] rounded-full transition-[background-color,transform] duration-200 ${
                  i === index ? "w-[6px] scale-125 bg-gold" : i < index ? "w-[6px] bg-gold-soft" : "w-[6px] bg-line"
                }`}
              />
            ))}
          </div>
          <div className="flex items-center gap-2">
            {!last && (
              <button type="button" onClick={onClose} className="px-2 py-2 text-xs font-semibold text-faint hover:text-ink">
                Skip tour
              </button>
            )}
            {index > 0 && (
              <button type="button" onClick={back} className="btn-secondary !px-3 !py-2 !text-xs">
                Back
              </button>
            )}
            <button ref={primaryRef} type="button" onClick={next} className="btn-primary !px-4 !py-2 !text-xs">
              {last ? "Done" : "Next"}
            </button>
          </div>
        </div>
        <p className="sr-only" aria-live="polite">
          Step {index + 1} of {steps.length}: {step.title}
        </p>
      </div>
    </>,
    document.body,
  );
}
