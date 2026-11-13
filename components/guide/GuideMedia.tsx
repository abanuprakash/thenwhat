import Image from "next/image";
import type { ReactNode } from "react";

export { GuideClip } from "@/components/guide/GuideClip";

/** A screenshot in the guide. Wide ones open full size in a new tab; phone ones sit in a phone frame. */
export function GuideFigure({ src, alt, width, height, phone }: { src: string; alt: string; width: number; height: number; phone?: boolean }) {
  const img = <Image src={src} alt={alt} width={width} height={height} className="guide-shot" sizes={phone ? "260px" : "(min-width: 820px) 720px, 100vw"} />;
  return (
    <figure className={`guide-fig${phone ? " phone" : ""}`}>
      {phone ? (
        img
      ) : (
        <a href={src} target="_blank" rel="noopener" className="block cursor-zoom-in" aria-label={`Open full size: ${alt}`}>
          {img}
        </a>
      )}
      <figcaption>{alt}</figcaption>
    </figure>
  );
}

/**
 * A table in the guide. Wide screens get the table; phones get one card per row, with the
 * column names as labels (docs/DESIGN.md: render a separate list rather than restyling the table).
 */
export function GuideTable({ head, rows }: { head: string[]; rows: ReactNode[][] }) {
  return (
    <>
      <div className="guide-table hidden desk:block">
        <table>
          <thead>
            <tr>
              {head.map((h, i) => (
                <th key={i} scope="col">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                {r.map((c, j) =>
                  j === 0 ? (
                    <th key={j} scope="row">
                      {c}
                    </th>
                  ) : (
                    <td key={j}>{c}</td>
                  ),
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="desk:hidden">
      <ul className="guide-cards grid gap-2.5" role="list">
        {rows.map((r, i) => (
          <li key={i} className="card px-4 py-3">
            <p className="font-semibold text-ink">{r[0]}</p>
            <dl className="mt-2 grid gap-1.5">
              {r.slice(1).map((c, j) => (
                <div key={j} className="grid grid-cols-[minmax(0,40%)_1fr] gap-3">
                  <dt className="text-faint">{head[j + 1] || " "}</dt>
                  <dd>{c}</dd>
                </div>
              ))}
            </dl>
          </li>
        ))}
      </ul>
      </div>
    </>
  );
}
