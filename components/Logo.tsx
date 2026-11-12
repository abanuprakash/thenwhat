import Link from "next/link";
import { BRAND } from "@/lib/brand";

/**
 * The wordmark: "Then what" set in the story serif, with the question mark in gold.
 * On hover the question mark tilts a little, like someone leaning in to hear the next line.
 */
export function Logo() {
  return (
    <Link href="/" aria-label={`${BRAND.name}, home`} className="group inline-flex items-baseline font-serif text-lg font-bold tracking-[.005em] text-ink hover:text-ink">
      <span>Then what</span>
      <span
        aria-hidden="true"
        className="ml-[1px] inline-block origin-bottom text-gold transition-transform duration-300 [transition-timing-function:var(--ease-out)] group-hover:rotate-[14deg] group-hover:-translate-y-[1px]"
      >
        ?
      </span>
    </Link>
  );
}
