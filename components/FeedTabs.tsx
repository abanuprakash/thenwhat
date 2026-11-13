"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, useTransition, type MouseEvent, type ReactNode } from "react";

type Tab = { key: string; label: string; href: string };

const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

/**
 * The home feed's tabs (Trending, New, Top, Finished, Following).
 * - The gold underline glides to the tab you tap, straight away, and breathes softly until the list arrives.
 * - Meanwhile the current list dims a little, so it's clear something is on its way (and it's marked aria-busy).
 * - The new list slides in from the side you moved towards, then its stories arrive one after another.
 * Tabs are real links, so opening one in a new tab or without JavaScript still works.
 */
export function FeedTabs({ tabs, active, children }: { tabs: Tab[]; active: string; children: ReactNode }) {
  const router = useRouter();
  const [loading, start] = useTransition();
  // The tab tapped last; it only counts while its list is loading.
  const [chosen, setChosen] = useState(active);
  const shown = loading ? chosen : active;

  // Which way did we move? The new list comes in from that side.
  const order = tabs.map((t) => t.key);
  const prev = useRef(active);
  const [dir, setDir] = useState(0);
  useEffect(() => {
    setDir(Math.sign(order.indexOf(active) - order.indexOf(prev.current)));
    prev.current = active;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  // Underline position: measured from the chosen tab, moved with transform only.
  const navRef = useRef<HTMLElement>(null);
  const refs = useRef(new Map<string, HTMLAnchorElement>());
  const [bar, setBar] = useState<{ x: number; w: number } | null>(null);
  const [placed, setPlaced] = useState(false);
  const measure = useCallback(() => {
    const el = refs.current.get(shown);
    const nav = navRef.current;
    if (!el || !nav) return;
    setBar({ x: el.offsetLeft, w: el.offsetWidth });
  }, [shown]);
  useIsoLayoutEffect(measure, [measure]);
  useEffect(() => {
    if (!navRef.current) return;
    const ro = new ResizeObserver(measure);
    ro.observe(navRef.current);
    return () => ro.disconnect();
  }, [measure]);
  useEffect(() => {
    if (!bar || placed) return;
    const id = requestAnimationFrame(() => setPlaced(true));
    return () => cancelAnimationFrame(id);
  }, [bar, placed]);
  // On a narrow screen, keep the chosen tab in view.
  useEffect(() => {
    refs.current.get(shown)?.scrollIntoView({ block: "nearest", inline: "nearest", behavior: placed ? "smooth" : "auto" });
  }, [shown, placed]);

  const go = (e: MouseEvent<HTMLAnchorElement>, tab: Tab) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return; // let the browser open new tabs
    e.preventDefault();
    if (tab.key === shown) return;
    setChosen(tab.key);
    start(() => router.push(tab.href, { scroll: false }));
  };

  return (
    <>
      <nav ref={navRef} aria-label="Story lists" className="feed-tabs relative mb-2 flex gap-[26px] overflow-x-auto border-b border-black/[.08]">
        {tabs.map((t) => (
          <Link
            key={t.key}
            href={t.href}
            scroll={false}
            ref={(el) => {
              if (el) refs.current.set(t.key, el);
              else refs.current.delete(t.key);
            }}
            onClick={(e) => go(e, t)}
            aria-current={shown === t.key ? "page" : undefined}
            className={`press whitespace-nowrap pb-[11px] pt-[2px] text-[13px] font-semibold transition-colors duration-200 ${shown === t.key ? "text-ink" : "text-faint"} hover:text-ink`}
          >
            {t.label}
          </Link>
        ))}
        <span
          aria-hidden="true"
          className="feed-bar pointer-events-none absolute bottom-0 left-0 h-[2px] w-[100px] origin-left rounded-full bg-gold"
          data-placed={placed || undefined}
          data-loading={loading || undefined}
          style={{ transform: `translateX(${bar?.x ?? 0}px) scaleX(${(bar?.w ?? 0) / 100})`, opacity: bar ? 1 : 0 }}
        />
      </nav>
      <div className="feed-body" data-loading={loading || undefined} aria-busy={loading || undefined}>
        <div key={active} className="feed-enter" style={{ "--dir": dir } as React.CSSProperties}>
          {children}
        </div>
      </div>
      <p className="sr-only" role="status">
        {loading ? `Loading ${tabs.find((t) => t.key === chosen)?.label ?? ""} stories` : ""}
      </p>
    </>
  );
}
