import Link from "next/link";
import { Logo } from "@/components/Logo";
import { BRAND, OPERATOR } from "@/lib/brand";

const LINKS = [
  { href: "/about", label: "About us" },
  { href: "/changelog", label: "Changelog" },
  { href: "/pricing", label: "Pricing" },
  { href: "/privacy", label: "Privacy policy" },
  { href: "/terms", label: "Terms" },
];

/** The last page of every page: the mark, where to read more, and who made it. */
export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-8 border-t border-black/[.07] bg-sand/60 pb-28 pt-10 desk:pb-10">
      <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-8 px-4 desk:flex-row desk:items-start desk:justify-between desk:px-6">
        <div className="max-w-[320px]">
          <Logo />
          <p className="mt-2 font-serif text-[15px] leading-relaxed text-muted">{BRAND.tagline}</p>
        </div>
        <nav aria-label="About Then What">
          <ul className="grid grid-cols-2 gap-x-8 gap-y-2 text-[13px] font-medium desk:grid-cols-1">
            {LINKS.map((l) => (
              <li key={l.href}>
                <Link href={l.href} prefetch={false} className="text-muted hover:text-gold">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
      <div className="mx-auto mt-8 flex w-full max-w-[1100px] flex-col gap-2 border-t border-black/[.06] px-4 pt-5 text-xs text-faint desk:flex-row desk:items-center desk:justify-between desk:px-6">
        <p>
          © {year} {BRAND.name}. Every story belongs to the people who wrote it.
        </p>
        <p>
          {OPERATOR.by}, {OPERATOR.city} · Made in{" "}
          <span className="made-in font-semibold text-gold" aria-hidden="true">
            {OPERATOR.madeIn.map((place) => (
              <span key={place}>{place}</span>
            ))}
          </span>
          <span className="made-in-still font-semibold text-gold" aria-hidden="true">
            {OPERATOR.madeIn.join(", ")}
          </span>
          <span className="sr-only">{OPERATOR.madeIn.join(", ")}</span>
        </p>
      </div>
    </footer>
  );
}
