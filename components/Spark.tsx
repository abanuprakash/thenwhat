"use client";
import { useState } from "react";
import { SPARKS } from "@/lib/brand";

/** "Stuck? Get a spark": shows a random story nudge. It never writes for you. */
export function Spark() {
  const [index, setIndex] = useState<number | null>(null);
  const next = () => {
    let i = Math.floor(Math.random() * SPARKS.length);
    if (i === index) i = (i + 1) % SPARKS.length;
    setIndex(i);
  };
  return (
    <div className="mt-4 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-xs">
      <button type="button" onClick={next} className="press font-semibold text-gold hover:text-gold-dark">
        {index === null ? "Stuck? Get a spark" : "Another spark"}
        <span aria-hidden="true"> ✦</span>
      </button>
      <span aria-live="polite" className="text-muted">
        {index !== null && (
          <em key={index} className="animate-fade font-serif text-[13px] not-italic text-ink">
            “{SPARKS[index]}”
          </em>
        )}
      </span>
    </div>
  );
}
