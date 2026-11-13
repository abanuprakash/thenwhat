import type { ReactNode } from "react";
import { OPERATOR } from "@/lib/brand";

/**
 * Layout for the pages that tell Then What's own story (About, Privacy, Terms, Changelog): an
 * opening line in the story serif, then chapters along a path, like lines in a story. Every
 * chapter leads with a story-like line (serif) and follows with the plain facts (sans), so the
 * page reads as a story without hiding anything a reader needs.
 */
export function StoryPage({
  eyebrow,
  title,
  opening,
  meta,
  wide,
  children,
}: {
  eyebrow: string;
  title: string;
  opening: ReactNode;
  meta?: ReactNode;
  /** Room for screenshots (the guide). */
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <article className={`container-narrow animate-page${wide ? " desk:max-w-[780px]" : ""}`}>
      <p className="eyebrow mb-3">{eyebrow}</p>
      <h1 className="font-serif text-[30px] font-semibold leading-tight text-ink desk:text-[36px]">{title}</h1>
      <p className="mt-4 font-serif text-[19px] leading-relaxed text-muted">{opening}</p>
      {meta && <p className="mt-3 text-xs font-medium text-faint">{meta}</p>}
      <div className="mt-10">{children}</div>
    </article>
  );
}

export function Chapters({ children, label }: { children: ReactNode; label: string }) {
  return (
    <ol className="story-path animate-stagger" aria-label={label}>
      {children}
    </ol>
  );
}

/** One chapter: "Line n", a title, the story beat, then the details. */
export function Chapter({ n, title, line, children, id }: { n: number | string; title: string; line?: ReactNode; children?: ReactNode; id?: string }) {
  return (
    <li id={id} className="scroll-mt-24" style={{ "--i": typeof n === "number" ? n : 0 } as React.CSSProperties}>
      <span className="story-node" aria-hidden="true" />
      <p className="eyebrow mb-1 !text-[10px]">Line {n}</p>
      <h2 className="text-[17px] font-semibold text-ink">{title}</h2>
      {line && <p className="mt-2 font-serif text-[17px] leading-relaxed text-ink">{line}</p>}
      {children && <div className="story-facts mt-3 space-y-3 text-sm leading-relaxed text-muted">{children}</div>}
    </li>
  );
}

/** "In short": the whole page in a few lines, for people who won't read the rest. */
export function InShort({ children }: { children: ReactNode }) {
  return (
    <section className="panel mb-10 border border-black/[.06] px-5 py-[18px]" aria-labelledby="in-short">
      <h2 id="in-short" className="eyebrow mb-3">
        In short
      </h2>
      <ul className="space-y-2 text-sm leading-relaxed text-ink">{children}</ul>
    </section>
  );
}

export function Short({ children }: { children: ReactNode }) {
  return (
    <li className="flex gap-3">
      <span aria-hidden="true" className="mt-[7px] h-[6px] w-[6px] flex-none rounded-full bg-gold" />
      <span>{children}</span>
    </li>
  );
}

/** The closing beat of every story page. */
export function TheEnd({ children }: { children: ReactNode }) {
  return (
    <section className="mt-12 border-t border-black/[.08] pt-8 text-center">
      <p className="font-serif text-[22px] text-ink">
        The end<span className="text-gold">?</span> Not quite.
      </p>
      <div className="mt-4 flex flex-wrap justify-center gap-3">{children}</div>
    </section>
  );
}

/** How to reach us, or an honest "coming soon" until the address is set (OPERATOR in lib/brand.ts). */
export function Contact() {
  return OPERATOR.contactEmail ? (
    <a href={`mailto:${OPERATOR.contactEmail}`}>{OPERATOR.contactEmail}</a>
  ) : (
    <span>our contact address, which we&apos;ll publish on this page before launch</span>
  );
}
