/**
 * Small drawings for things going wrong, in the Then What branching motif (gold, line, paper).
 * - SnappedThread: a story's thread broken in the middle. Offline, a request that didn't arrive.
 * - RejoinedThread: the same thread tied back together with a knot. Back online.
 * - TangledBranch: the Then What question mark with its branches in a knot. Something broke.
 * They animate once when they appear (see "Failure states" in globals.css) and are decorative:
 * the words next to them carry the meaning.
 */

type Props = { size?: number; className?: string };

export function SnappedThread({ size = 48, className = "" }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true" className={`art-snap ${className}`}>
      <circle cx="8" cy="31" r="4.2" className="fill-gold-soft" />
      <g className="snap-l">
        <path d="M11.6 29.2C15.6 27 18.6 24.6 21.2 22.4" fill="none" className="stroke-gold" strokeWidth="2.2" strokeLinecap="round" />
        <path d="M21.2 22.4l.6-2.6M21.2 22.4l2.5-.4" fill="none" className="stroke-gold" strokeWidth="1.2" strokeLinecap="round" />
      </g>
      <g className="snap-r">
        <path d="M27.2 19.4C30.6 17.4 33.6 15.2 36.4 13" fill="none" className="stroke-line" strokeWidth="2.2" strokeLinecap="round" />
        <path d="M27.2 19.4l-.4 2.6M27.2 19.4l-2.4.8" fill="none" className="stroke-line" strokeWidth="1.2" strokeLinecap="round" />
      </g>
      <circle cx="40" cy="11" r="4.2" className="fill-line snap-node" />
      <g className="snap-spark">
        <circle cx="24.2" cy="15.5" r="1" className="fill-gold-soft" />
        <circle cx="20" cy="17" r=".8" className="fill-gold-soft" />
        <circle cx="28.4" cy="25" r=".8" className="fill-gold-soft" />
      </g>
    </svg>
  );
}

export function RejoinedThread({ size = 48, className = "" }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true" className={`art-rejoin ${className}`}>
      <circle cx="8" cy="31" r="4.2" className="fill-gold-soft" />
      <path d="M11.6 29.2C17 26 21 23 24 21.2S31.6 16.6 36.4 13" fill="none" className="stroke-gold rejoin-line" strokeWidth="2.2" strokeLinecap="round" pathLength={1} />
      <circle cx="24" cy="21.2" r="2.6" className="fill-gold rejoin-knot" />
      <circle cx="40" cy="11" r="4.2" className="fill-gold-soft" />
    </svg>
  );
}

export function TangledBranch({ size = 48, className = "" }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true" className={`art-tangle ${className}`}>
      <path
        d="M16.5 15.5c0-4.7 3.6-8 8-8s8 3.2 8 7.6c0 3.8-2.6 5.6-5.2 7.1-1.7 1-2.8 2.2-2.8 4.5V29"
        fill="none"
        className="stroke-gold"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
      <path
        className="stroke-line tangle-knot"
        pathLength={1}
        d="M24.5 29.5c-4.6 1.2-7.4 5.6-4 7.4 3.2 1.7 8.6-2.4 5.6-5-2.8-2.5-9.2 2.6-6.2 5.6 2.6 2.6 9.8.4 9.2-3.4"
        fill="none"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path d="M29.1 34.1 33 39.5" fill="none" className="stroke-line" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M19.4 36.6 15 40.6" fill="none" className="stroke-line" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="33.6" cy="40.4" r="2.2" className="fill-gold-soft" />
      <circle cx="14.4" cy="41.4" r="2.2" className="fill-gold-soft" />
    </svg>
  );
}
