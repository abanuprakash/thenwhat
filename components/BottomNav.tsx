"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { Role } from "@/lib/types";

type Key = "home" | "tree" | "write" | "profile" | "dashboard";
type Item = { key: Key; href: string; label: string };

// useLayoutEffect warns during server rendering; this is a client component but it is still pre-rendered.
const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

/**
 * Mobile navigation (below 760px).
 * - A cream marker slides to the active tab, and moves the moment you tap (before the page arrives).
 * - It tucks away while you scroll down to read and comes back when you scroll up or reach the end.
 * - It steps aside while the on-screen keyboard is open, so the composer has the room.
 * Only transform and opacity animate; reduced motion lands everything instantly (globals.css).
 */
export function BottomNav({ role, handle }: { role: Role | null; handle: string | null }) {
  const path = usePathname();
  const isAuthor = role === "author" || role === "admin";
  const story = path.match(/^\/s\/([^/]+)(?:\/([0-9a-f-]{36}))?/);
  const treeHref = story ? `/s/${story[1]}/tree${story[2] ? `?at=${story[2]}` : ""}` : null;

  // Write sits in the exact centre for everyone; each side spreads its own tabs.
  // Guests and readers see it too: the middleware sends them to sign in or to "become an author".
  const left: Item[] = [
    { key: "home", href: "/", label: "Home" },
    ...(treeHref ? [{ key: "tree" as const, href: treeHref, label: "Tree" }] : []),
  ];
  const write: Item = { key: "write", href: "/new", label: "Write" };
  const right: Item[] = [
    { key: "profile", href: handle ? `/u/${handle}` : "/login", label: handle ? "Profile" : "Sign in" },
    ...(isAuthor ? [{ key: "dashboard" as const, href: "/dashboard", label: "Dashboard" }] : []),
  ];
  const items = [...left, write, ...right];

  const routeActive: Key | null =
    path === "/" ? "home"
    : path.endsWith("/tree") ? "tree"
    : path === "/new" || path.startsWith("/write/") ? "write"
    : (handle && path === `/u/${handle}`) || (!handle && path === "/login") ? "profile"
    : path.startsWith("/dashboard") ? "dashboard"
    : null;

  // Tapped but not arrived yet: show it as chosen straight away. It's remembered with the page it
  // was tapped on, so it simply stops applying once the new page arrives.
  const [pending, setPending] = useState<{ key: Key; on: string } | null>(null);
  const active = pending && pending.on === path ? pending.key : routeActive;

  // The tab that just stopped being active gets a short "let go" movement.
  const previous = useRef(active);
  const [leaving, setLeaving] = useState<Key | null>(null);
  useEffect(() => {
    const was = previous.current;
    previous.current = active;
    if (was && was !== active) setLeaving(was);
  }, [active]);

  // ── Sliding marker ────────────────────────────────────────────────────────
  const navRef = useRef<HTMLElement>(null);
  const refs = useRef(new Map<Key, HTMLAnchorElement>());
  const [marker, setMarker] = useState<{ x: number; ready: boolean } | null>(null);
  const [placed, setPlaced] = useState(false);

  const measure = useCallback(() => {
    const nav = navRef.current;
    const el = active && active !== "write" ? refs.current.get(active) : null;
    if (!nav || !el) return setMarker((m) => (m ? { ...m, ready: false } : null));
    const n = nav.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    setMarker({ x: r.left - n.left + r.width / 2, ready: true });
  }, [active]);

  useIsoLayoutEffect(measure, [measure, items.length]);
  useEffect(() => {
    if (!navRef.current) return;
    const ro = new ResizeObserver(measure);
    ro.observe(navRef.current);
    return () => ro.disconnect();
  }, [measure]);
  // The first placement doesn't slide in from the edge.
  useEffect(() => {
    if (!marker?.ready || placed) return;
    const id = requestAnimationFrame(() => setPlaced(true));
    return () => cancelAnimationFrame(id);
  }, [marker?.ready, placed]);

  // ── Tuck away on scroll down, return on scroll up ─────────────────────────
  // Tucked away on a given page; a new page always starts with the bar showing.
  const [tuckedOn, setTuckedOn] = useState<string | null>(null);
  const pathRef = useRef(path);
  useEffect(() => {
    pathRef.current = path;
  }, [path]);
  const tucked = tuckedOn === path;
  useEffect(() => {
    // Measure distance travelled since the scroll last changed direction, so slow scrolls count too.
    let last = window.scrollY;
    let turn = last;
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        if ((y > last) !== (last > turn)) turn = last;
        const nearEnd = window.innerHeight + y >= document.documentElement.scrollHeight - 48;
        if (y < 64 || nearEnd) setTuckedOn(null);
        else if (y - turn > 24) setTuckedOn(pathRef.current);
        else if (turn - y > 24) setTuckedOn(null);
        last = y;
        ticking = false;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // ── Step aside for the on-screen keyboard ─────────────────────────────────
  const [keyboard, setKeyboard] = useState(false);
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const check = () => setKeyboard(window.innerHeight - vv.height > 150);
    vv.addEventListener("resize", check);
    return () => vv.removeEventListener("resize", check);
  }, []);

  const [focusInside, setFocusInside] = useState(false);
  const hidden = keyboard || (tucked && !focusInside);

  const renderItem = (item: Item) => {
    const on = active === item.key;
    const common = {
      href: item.href,
      "aria-current": on ? ("page" as const) : undefined,
      ref: (el: HTMLAnchorElement | null) => {
        if (el) refs.current.set(item.key, el);
        else refs.current.delete(item.key);
      },
      onClick: () => item.key !== routeActive && setPending({ key: item.key, on: path }),
    };

    if (item.key === "write") {
      return (
        <Link key={item.key} {...common} className="nav-item group relative z-[1] -mt-[18px] flex min-w-[64px] flex-col items-center gap-[5px] text-[11px] font-semibold text-ink hover:text-ink">
          <span className="nav-fab flex h-[46px] w-[46px] items-center justify-center rounded-full bg-gold text-white" data-on={on || undefined}>
            <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true" className="nav-plus">
              <path d="M10 3.5v13M3.5 10h13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </span>
          {item.label}
        </Link>
      );
    }

    return (
      <Link
        key={item.key}
        {...common}
        className={`nav-item relative z-[1] flex min-h-[52px] min-w-[64px] flex-col items-center justify-center gap-[5px] px-2 text-[11px] font-semibold ${on ? "text-ink" : "text-faint"} hover:text-ink`}
        data-on={on || undefined}
        data-leaving={leaving === item.key || undefined}
        onAnimationEnd={(e) => e.animationName === "sb-icon-letgo" && setLeaving(null)}
      >
        <span className="nav-icon flex h-[30px] items-center">
          <Icon name={item.key} on={on} />
        </span>
        {item.label}
      </Link>
    );
  };

  // First sign-in screen: nothing else is reachable until it's done.
  if (path === "/welcome") return null;

  return (
    <nav
      ref={navRef}
      aria-label="Mobile"
      onFocus={() => setFocusInside(true)}
      onBlur={(e) => !e.currentTarget.contains(e.relatedTarget) && setFocusInside(false)}
      className="nav-bar fixed inset-x-0 bottom-0 z-30 flex items-stretch border-t border-black/[.07] bg-paper/90 px-1 pb-[max(8px,env(safe-area-inset-bottom))] pt-[6px] backdrop-blur-md desk:hidden"
      data-hidden={hidden || undefined}
    >
      {/* The marker behind the active icon */}
      <span
        aria-hidden="true"
        className="nav-marker pointer-events-none absolute left-0 top-[7px] h-[30px] w-[56px] rounded-full bg-cream"
        data-placed={placed || undefined}
        style={{
          transform: `translateX(${(marker?.x ?? 0) - 28}px) scale(${marker?.ready ? 1 : 0.6})`,
          opacity: marker?.ready ? 1 : 0,
        }}
      />
      <div className="flex flex-1 items-stretch justify-around">{left.map(renderItem)}</div>
      <div className="flex w-[76px] shrink-0 justify-center">{renderItem(write)}</div>
      <div className="flex flex-1 items-stretch justify-around">{right.map(renderItem)}</div>
    </nav>
  );
}

/**
 * 20px line icons. When a tab becomes active its icon rebuilds itself: lines draw in
 * (`ic-draw`, pathLength 1), small parts pop into place (`ic-pop`), then the soft fill
 * arrives (`nav-fill`). `--d` staggers the pieces; the whole build stays under 600ms.
 */
function Icon({ name, on }: { name: Exclude<Key, "write">; on: boolean }) {
  const fill = { fill: "currentColor", className: "nav-fill", style: { opacity: on ? 0.16 : 0 } };
  const line = { fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinejoin: "round" as const, strokeLinecap: "round" as const };
  const draw = (d: number) => ({ ...line, pathLength: 1, className: "ic-draw", style: { "--d": `${d}ms` } as React.CSSProperties });
  const pop = (d: number) => ({ className: "ic-pop", style: { "--d": `${d}ms` } as React.CSSProperties });
  switch (name) {
    case "home":
      return (
        <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true" className="overflow-visible">
          <path d="M3 9.2 10 3.5l7 5.7V17h-4.6v-4.4H7.6V17H3z" {...fill} />
          {/* Roof first, then the walls and door */}
          <path d="M3 9.2 10 3.5l7 5.7" {...draw(0)} />
          <path d="M17 9.2V17h-4.6v-4.4H7.6V17H3V9.2" {...draw(140)} />
        </svg>
      );
    case "tree":
      return (
        <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true" className="overflow-visible">
          {/* The first line, then the trunk, then two branches grow and their lines appear */}
          <circle cx="10" cy="3.4" r="2" fill="currentColor" {...pop(0)} />
          <path d="M10 5.4V9" {...draw(80)} />
          <path d="M10 9 5.9 14" {...draw(180)} />
          <path d="M10 9l4.1 5" {...draw(180)} />
          <circle cx="5" cy="15.6" r="2" fill="currentColor" {...pop(320)} />
          <circle cx="15" cy="15.6" r="2" {...pop(400)} className={`ic-pop nav-leaf ${on ? "fill-gold" : "fill-current"}`} />
        </svg>
      );
    case "profile":
      return (
        <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true" className="overflow-visible">
          <circle cx="10" cy="7" r="3.4" {...fill} />
          <path d="M10 3.6a3.4 3.4 0 1 1 0 6.8a3.4 3.4 0 1 1 0-6.8z" {...draw(0)} />
          <path d="M3.8 17c.8-3.2 3.3-5 6.2-5s5.4 1.8 6.2 5" {...draw(160)} />
        </svg>
      );
    case "dashboard":
      return (
        <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true" className="overflow-visible">
          {/* Tiles land one after another */}
          <g {...pop(0)}>
            <rect x="3" y="3" width="6" height="7" rx="1.2" {...fill} />
            <rect x="3" y="3" width="6" height="7" rx="1.2" {...line} />
          </g>
          <g {...pop(70)}>
            <rect x="11" y="3" width="6" height="5" rx="1.2" {...line} />
          </g>
          <g {...pop(140)}>
            <rect x="11" y="10" width="6" height="7" rx="1.2" {...fill} />
            <rect x="11" y="10" width="6" height="7" rx="1.2" {...line} />
          </g>
          <g {...pop(210)}>
            <rect x="3" y="12" width="6" height="5" rx="1.2" {...line} />
          </g>
        </svg>
      );
  }
}
