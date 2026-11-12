"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavLink({ href, exact, children }: { href: string; exact?: boolean; children: React.ReactNode }) {
  const path = usePathname();
  const active = exact ? path === href : path === href || path.startsWith(href + "/");
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`relative text-[13px] font-semibold transition-colors duration-200 ${active ? "text-ink" : "text-faint"} hover:text-ink after:absolute after:-bottom-[6px] after:left-0 after:h-[2px] after:rounded-full after:bg-gold after:transition-[width] after:duration-300 after:content-[''] ${active ? "after:w-full" : "after:w-0 hover:after:w-full"}`}
    >
      {children}
    </Link>
  );
}
