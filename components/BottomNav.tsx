"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Role } from "@/lib/types";

/** Mobile navigation (below 760px), as in the prototype. */
export function BottomNav({ role, handle }: { role: Role | null; handle: string | null }) {
  const path = usePathname();
  // First sign-in screen: nothing else is reachable until it's done.
  if (path === "/welcome") return null;
  const isAuthor = role === "author" || role === "admin";
  const story = path.match(/^\/s\/([^/]+)(?:\/([0-9a-f-]{36}))?/);
  const treeHref = story ? `/s/${story[1]}/tree${story[2] ? `?at=${story[2]}` : ""}` : null;
  const profileHref = handle ? `/u/${handle}` : "/login";

  const item = (active: boolean) =>
    `press flex flex-col items-center gap-1 px-[10px] py-[6px] text-[10px] font-semibold transition-colors duration-200 ${active ? "text-ink" : "text-faint"} hover:text-ink`;
  const color = (active: boolean) => (active ? "#1C1A17" : "#736A5D");

  return (
    <nav
      aria-label="Mobile"
      className="fixed inset-x-0 bottom-0 z-30 flex items-stretch justify-around border-t border-black/[.08] bg-[#FBF8F2] px-1 pb-[max(10px,env(safe-area-inset-bottom))] pt-[6px] desk:hidden"
    >
      <Link href="/" className={item(path === "/")} aria-current={path === "/" ? "page" : undefined}>
        <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
          <path d="M2 8.5 9 3l7 5.5V16H11v-4H7v4H2z" fill="none" stroke={color(path === "/")} strokeWidth="1.6" strokeLinejoin="round" />
        </svg>
        Home
      </Link>
      {treeHref && (
        <Link href={treeHref} className={item(path.endsWith("/tree"))}>
          <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
            <g stroke={color(path.endsWith("/tree"))} strokeWidth="1.6">
              <line x1="9" y1="2" x2="9" y2="8" />
              <line x1="9" y1="8" x2="4" y2="15" />
              <line x1="9" y1="8" x2="14" y2="15" />
            </g>
            <g fill={color(path.endsWith("/tree"))}>
              <circle cx="9" cy="2" r="2" />
              <circle cx="4" cy="15" r="2" />
              <circle cx="14" cy="15" r="2" />
            </g>
          </svg>
          Tree
        </Link>
      )}
      {isAuthor && (
        <Link href="/new" className={`${item(path === "/new")} -mt-[14px]`}>
          <span className="flex h-[38px] w-[38px] items-center justify-center rounded-full bg-gold text-xl font-semibold text-white shadow-[0_2px_6px_rgba(0,0,0,.2)]">
            +
          </span>
          Write
        </Link>
      )}
      <Link href={profileHref} className={item(path.startsWith("/u/"))}>
        <span
          aria-hidden="true"
          className="h-[18px] w-[18px] rounded-full border-[1.6px]"
          style={{ borderColor: color(path.startsWith("/u/")) }}
        />
        {handle ? "Profile" : "Sign in"}
      </Link>
      {isAuthor && (
        <Link
          href="/dashboard"
          className={item(path.startsWith("/dashboard"))}
          aria-current={path.startsWith("/dashboard") ? "page" : undefined}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
            <g fill="none" stroke={color(path.startsWith("/dashboard"))} strokeWidth="1.6">
              <rect x="2" y="2" width="6" height="7" rx="1" />
              <rect x="10" y="2" width="6" height="4" rx="1" />
              <rect x="10" y="8" width="6" height="8" rx="1" />
              <rect x="2" y="11" width="6" height="5" rx="1" />
            </g>
          </svg>
          Dashboard
        </Link>
      )}
    </nav>
  );
}
