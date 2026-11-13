import type { CSSProperties, ReactNode } from "react";

/**
 * Small drawings for tour steps and info tips, in the house style (docs/DESIGN.md §11): 1.6–2px
 * strokes in ink, gold for "this is the thing", branching nodes as the motif. Lines draw themselves
 * in (ic-draw) and dots land (ic-pop) once, when the step or tip appears; with reduced motion they
 * are simply there. Decorative: the words beside them carry the meaning.
 */
export type ArtName =
  | "welcome" | "tabs" | "story" | "star" | "key" | "profile" | "pen" | "compass" | "line" | "vote"
  | "branches" | "path" | "tree" | "book" | "zoom" | "counter" | "spark" | "send" | "dashboard"
  | "gauge" | "shield" | "check" | "pulse" | "ticket" | "info" | "people" | "flag" | "invite";

const d = (ms: number) => ({ "--d": `${ms}ms` }) as CSSProperties;
const Draw = ({ path, gold, delay = 0 }: { path: string; gold?: boolean; delay?: number }) => (
  <path d={path} pathLength={1} className={`ic-draw ${gold ? "stroke-gold" : ""}`} style={d(delay)} />
);
const Dot = ({ cx, cy, r = 2.6, gold, delay = 0, hollow }: { cx: number; cy: number; r?: number; gold?: boolean; delay?: number; hollow?: boolean }) => (
  <circle
    cx={cx}
    cy={cy}
    r={r}
    className={`ic-pop ${gold ? "fill-gold stroke-gold" : hollow ? "fill-white" : "fill-ink"}`}
    style={d(delay)}
  />
);

const ART: Record<ArtName, ReactNode> = {
  welcome: (
    <>
      <Draw path="M17 16a7 7 0 1 1 10.5 6c-2.2 1.2-3.5 2.6-3.5 5" gold />
      <Draw path="M24 31l-6 7M24 31l6 7" delay={260} />
      <Dot cx={24} cy={31} gold delay={200} />
      <Dot cx={18} cy={38.5} delay={420} />
      <Dot cx={30} cy={38.5} delay={460} />
    </>
  ),
  tabs: (
    <>
      <Draw path="M7 33h34" />
      <Draw path="M9 33v-8h9v8M30 33v-8h9v8" delay={120} />
      <Draw path="M19.5 33V20h9.5v13" gold delay={240} />
      <Draw path="M19.5 36.5h9.5" gold delay={420} />
    </>
  ),
  story: (
    <>
      <Draw path="M11 9h26v30H11z" />
      <Draw path="M16 17h16M16 23h13M16 29h9" delay={180} />
      <Draw path="M33 31l3-4 3 4" gold delay={380} />
    </>
  ),
  star: (
    <>
      <Draw path="M24 8l4.7 9.6 10.6 1.5-7.7 7.5 1.8 10.5L24 32.1l-9.4 5 1.8-10.5-7.7-7.5 10.6-1.5z" gold />
      <Dot cx={10} cy={11} r={1.6} gold delay={380} />
      <Dot cx={39} cy={9} r={1.4} gold delay={430} />
      <Dot cx={40} cy={36} r={1.2} gold delay={480} />
    </>
  ),
  key: (
    <>
      <Draw path="M23 24a7 7 0 1 1-6.2-7.7" gold />
      <Draw path="M22 22l17-0M33 22v5M38 22v4" delay={240} />
      <Dot cx={16} cy={24} r={2} delay={420} />
    </>
  ),
  profile: (
    <>
      <Draw path="M24 23a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13z" />
      <Draw path="M11 39c1.8-7 7-10.5 13-10.5S35.2 32 37 39" delay={220} />
      <Dot cx={36} cy={13} r={2.4} gold delay={420} />
    </>
  ),
  pen: (
    <>
      <Draw path="M30 9l9 9-17 17-10 2 2-10z" />
      <Draw path="M27 12l9 9" delay={200} />
      <Draw path="M12 37l6-6" gold delay={320} />
      <Draw path="M28 39h11" gold delay={440} />
    </>
  ),
  compass: (
    <>
      <Draw path="M24 40a16 16 0 1 0 0-32 16 16 0 0 0 0 32z" />
      <Draw path="M24 13l4 11-4 11-4-11z" gold delay={240} />
      <Dot cx={24} cy={24} r={1.8} delay={440} />
    </>
  ),
  line: (
    <>
      <Draw path="M9 17h30M9 24h30M9 31h18" />
      <Dot cx={33} cy={31} r={2.8} gold delay={360} />
    </>
  ),
  vote: (
    <>
      <Draw path="M16 21l8-10 8 10z" gold />
      <Draw path="M16 27l8 10 8-10z" delay={220} />
      <Dot cx={38} cy={14} r={1.6} gold delay={420} />
    </>
  ),
  branches: (
    <>
      <Draw path="M24 38V27M24 27l-11-12M24 27V13M24 27l11-12" />
      <Dot cx={24} cy={38} gold delay={120} />
      <Dot cx={24} cy={27} delay={240} />
      <Dot cx={13} cy={14} delay={380} hollow />
      <Dot cx={24} cy={12} gold delay={420} />
      <Dot cx={35} cy={14} delay={460} hollow />
    </>
  ),
  path: (
    <>
      <Draw path="M7 20h9v8H7zM20 20h9v8h-9z" />
      <Draw path="M33 20h9v8h-9z" gold delay={260} />
      <Draw path="M16.5 24h3M29.5 24h3" delay={420} />
    </>
  ),
  tree: (
    <>
      <Draw path="M24 10v8M24 18l-10 8M24 18l10 8M14 26v8M14 26l-6 8M34 26l6 8" />
      <Dot cx={24} cy={10} gold delay={120} />
      <Dot cx={24} cy={18} gold delay={200} />
      <Dot cx={14} cy={26} gold delay={280} />
      <Dot cx={34} cy={26} delay={300} hollow />
      <Dot cx={14} cy={34} gold delay={380} />
      <Dot cx={8} cy={34} delay={420} hollow />
      <Dot cx={40} cy={34} delay={460} hollow />
    </>
  ),
  book: (
    <>
      <Draw path="M24 14c-4-3-10-3.5-15-2v24c5-1.5 11-1 15 2 4-3 10-3.5 15-2V12c-5-1.5-11-1-15 2z" />
      <Draw path="M24 14v24" gold delay={280} />
      <Draw path="M13 20h6M13 25h6M29 20h6M29 25h6" delay={380} />
    </>
  ),
  zoom: (
    <>
      <Draw path="M21 32a11 11 0 1 0 0-22 11 11 0 0 0 0 22z" />
      <Draw path="M29 29l9 9" delay={240} />
      <Draw path="M21 16v10M16 21h10" gold delay={380} />
    </>
  ),
  counter: (
    <>
      <Draw path="M24 39a15 15 0 1 1 15-15" />
      <Draw path="M39 24a15 15 0 0 1-15 15" gold delay={300} />
      <Draw path="M24 17v7l5 3" delay={420} />
    </>
  ),
  spark: (
    <>
      <Draw path="M24 8c1.4 7.4 3.6 9.6 11 11-7.4 1.4-9.6 3.6-11 11-1.4-7.4-3.6-9.6-11-11 7.4-1.4 9.6-3.6 11-11z" gold />
      <Draw path="M36 30c.6 3 1.4 3.8 4 4.4-2.6.6-3.4 1.4-4 4.4-.6-3-1.4-3.8-4-4.4 2.6-.6 3.4-1.4 4-4.4z" delay={340} />
    </>
  ),
  send: (
    <>
      <Draw path="M8 23l31-13-9 29-7-11z" />
      <Draw path="M23 28l16-18" gold delay={260} />
      <Draw path="M8 36h7M5 31h5" delay={420} />
    </>
  ),
  dashboard: (
    <>
      <Draw path="M9 9h13v13H9zM26 9h13v8H26zM9 26h13v13H9z" />
      <Draw path="M26 21h13v18H26z" gold delay={300} />
    </>
  ),
  gauge: (
    <>
      <Draw path="M9 32a15 15 0 0 1 30 0" />
      <Draw path="M24 32l8-9" gold delay={300} />
      <Dot cx={24} cy={32} r={2.4} delay={420} />
      <Draw path="M12 37h24" delay={200} />
    </>
  ),
  shield: (
    <>
      <Draw path="M24 8l13 5v10c0 8.5-5.5 14.5-13 17-7.5-2.5-13-8.5-13-17V13z" />
      <Draw path="M18 24l4.5 4.5L31 20" gold delay={320} />
    </>
  ),
  check: (
    <>
      <Draw path="M24 40a16 16 0 1 0 0-32 16 16 0 0 0 0 32z" />
      <Draw path="M16.5 24.5l5 5L32 19" gold delay={320} />
    </>
  ),
  pulse: (
    <>
      <Dot cx={24} cy={24} r={3.2} gold />
      <Draw path="M17 17a10 10 0 0 0 0 14M31 17a10 10 0 0 1 0 14" delay={180} />
      <Draw path="M12 12a17 17 0 0 0 0 24M36 12a17 17 0 0 1 0 24" gold delay={340} />
    </>
  ),
  ticket: (
    <>
      <Draw path="M8 15h32v6a3 3 0 0 0 0 6v6H8v-6a3 3 0 0 0 0-6z" />
      <Draw path="M30 15v18" delay={240} />
      <Draw path="M14 21h10M14 27h6" gold delay={360} />
    </>
  ),
  info: (
    <>
      <Draw path="M24 40a16 16 0 1 0 0-32 16 16 0 0 0 0 32z" />
      <Draw path="M24 22v10" gold delay={260} />
      <Dot cx={24} cy={16.5} r={2} gold delay={360} />
    </>
  ),
  people: (
    <>
      <Draw path="M18 22a5 5 0 1 0 0-10 5 5 0 0 0 0 10zM8 36c1-6 5-9 10-9s9 3 10 9" />
      <Draw path="M32 21a4 4 0 1 0 0-8M33 26c4 .6 6.4 3.6 7 9" gold delay={300} />
    </>
  ),
  flag: (
    <>
      <Draw path="M13 40V9" />
      <Draw path="M13 10h20l-4 6 4 6H13" gold delay={240} />
    </>
  ),
  invite: (
    <>
      <Draw path="M8 14h32v22H8z" />
      <Draw path="M8 15l16 12 16-12" gold delay={260} />
      <Dot cx={38} cy={12} r={3} gold delay={440} />
    </>
  ),
};

/** A drawing on a cream disc. `size` in px. */
export function TourArt({ name, size = 64 }: { name: ArtName; size?: number }) {
  return (
    <span
      aria-hidden="true"
      className="tour-art inline-flex flex-none items-center justify-center rounded-full bg-cream"
      style={{ width: size, height: size }}
    >
      <svg
        viewBox="0 0 48 48"
        width={Math.round(size * 0.72)}
        height={Math.round(size * 0.72)}
        fill="none"
        stroke="currentColor"
        strokeWidth={size < 40 ? 2.4 : 1.9}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-ink"
      >
        {ART[name]}
      </svg>
    </span>
  );
}
