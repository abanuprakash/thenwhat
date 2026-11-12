"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/dashboard", label: "Overview", exact: true },
  { href: "/dashboard/review", label: "Review" },
  { href: "/dashboard/requests", label: "Requests" },
  { href: "/dashboard/stories", label: "Stories" },
  { href: "/dashboard/activity", label: "Activity" },
  { href: "/dashboard/invites", label: "Invites" },
  { href: "/dashboard/users", label: "Users", admin: true },
  { href: "/dashboard/plans", label: "Plans", admin: true },
  { href: "/dashboard/reports", label: "Reports", admin: true },
  { href: "/dashboard/settings", label: "Settings", admin: true },
];

export function DashNav({ isAdmin }: { isAdmin: boolean }) {
  const path = usePathname();
  return (
    <nav aria-label="Dashboard sections" className="-mx-4 overflow-x-auto px-4 desk:mx-0 desk:px-0">
      <ul className="flex min-w-max gap-1 border-b border-black/[.08]">
        {TABS.filter((t) => !t.admin || isAdmin).map((t) => {
          const active = t.exact ? path === t.href : path === t.href || path.startsWith(t.href + "/");
          return (
            <li key={t.href}>
              <Link
                href={t.href}
                aria-current={active ? "page" : undefined}
                className={`-mb-px block whitespace-nowrap border-b-2 px-3 py-[10px] text-[13px] font-semibold transition-colors duration-200 ${
                  active ? "border-gold text-ink" : "border-transparent text-faint"
                } hover:text-ink`}
              >
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
