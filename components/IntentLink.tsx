"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ComponentProps } from "react";

type Props = Omit<ComponentProps<typeof Link>, "prefetch" | "href"> & { href: string };

/**
 * A link for long lists (feed cards, profile lists, dashboard tables, branches, the path, the mini
 * tree). It isn't prefetched when it scrolls into view, which on a list means dozens of
 * background requests nobody asked for. It is prefetched the moment someone shows intent:
 * pointing at it, focusing it with the keyboard, or touching it. So opening it still feels
 * instant, for the cost of one request per link actually considered.
 * Keep plain <Link> for navigation (header, tabs, bottom bar), where prefetching every link is cheap.
 */
export function IntentLink({ href, onMouseEnter, onFocus, onTouchStart, ...rest }: Props) {
  const router = useRouter();
  const warm = () => router.prefetch(href);
  return (
    <Link
      href={href}
      prefetch={false}
      onMouseEnter={(e) => {
        warm();
        onMouseEnter?.(e);
      }}
      onFocus={(e) => {
        warm();
        onFocus?.(e);
      }}
      onTouchStart={(e) => {
        warm();
        onTouchStart?.(e);
      }}
      {...rest}
    />
  );
}
