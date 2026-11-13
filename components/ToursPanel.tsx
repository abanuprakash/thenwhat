"use client";
import { useState, useTransition } from "react";
import { resetTours } from "@/app/account-actions";
import { safely } from "@/lib/client-action";
import { TOURS, type TourId } from "@/lib/tours";
import { IntentLink } from "@/components/IntentLink";
import { TourArt, type ArtName } from "@/components/TourArt";
import { BusyButton } from "@/components/Pending";
import { forgetTours, startTour } from "@/components/Tour";

const ART: Record<TourId, ArtName> = {
  home: "story",
  reading: "branches",
  tree: "tree",
  write: "pen",
  new: "book",
  dashboard: "dashboard",
  settings: "gauge",
  profile: "profile",
};

/**
 * On your own profile: every tour your role has, each one a tap away, plus "Show all tours again".
 * `href` is where the tour lives (with ?tour=<id> so it starts on arrival); null = this page.
 */
export function ToursPanel({ tours }: { tours: { id: TourId; href: string | null }[] }) {
  const [busy, start] = useTransition();
  const [note, setNote] = useState<{ ok: boolean; text: string }>();

  const reset = () =>
    start(async () => {
      const res = await safely(() => resetTours());
      if (res.error) {
        setNote({ ok: false, text: "failure" in res ? "That didn't reach us, so nothing changed. Try again in a moment." : res.error });
        return;
      }
      forgetTours();
      setNote({ ok: true, text: "Done. Each tour will show once more as you move around." });
    });

  return (
    <section className="panel mb-[26px] px-5 py-[18px]" aria-labelledby="tours-heading" data-tour="profile-tours">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="tours-heading" className="eyebrow">
          Tours
        </h2>
        <p className="text-[11px] font-medium text-faint">
          Or tap <span className="font-serif font-semibold text-gold">?</span> at the top of any page
        </p>
      </div>
      <ul className="divide-y divide-black/[.06]">
        {tours.map(({ id, href }) => {
          const tour = TOURS[id];
          return (
            <li key={id} className="flex items-center gap-3 py-[10px]">
              <TourArt name={ART[id]} size={36} />
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold text-ink">{tour.name}</p>
                <p className="text-xs text-faint">{tour.about}</p>
              </div>
              {href ? (
                <IntentLink href={href} className="btn-secondary !px-3 !py-[6px] !text-xs" aria-label={`Take the tour: ${tour.name}`}>
                  Take it
                </IntentLink>
              ) : (
                <button type="button" onClick={() => startTour(id)} className="btn-secondary !px-3 !py-[6px] !text-xs" aria-label={`Take the tour: ${tour.name}`}>
                  Take it
                </button>
              )}
            </li>
          );
        })}
      </ul>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <BusyButton busy={busy} onClick={reset} className="btn-outline-gold !py-[7px] !text-xs">
          Show all tours again
        </BusyButton>
        {note && (
          <p role={note.ok ? "status" : "alert"} className={`text-xs ${note.ok ? "text-muted" : "text-red-800"}`}>
            {note.text}
          </p>
        )}
      </div>
    </section>
  );
}
