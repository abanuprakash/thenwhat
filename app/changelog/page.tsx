import type { Metadata } from "next";
import Link from "next/link";
import { Chapter, Chapters, StoryPage, TheEnd } from "@/components/StoryPage";
import { TourArt } from "@/components/TourArt";
import { BRAND } from "@/lib/brand";
import { RELEASES } from "@/lib/changelog";

export const metadata: Metadata = {
  title: "Changelog",
  description: `Everything that's changed on ${BRAND.name}, newest first.`,
};

const day = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

export default function ChangelogPage() {
  return (
    <StoryPage
      eyebrow="Changelog"
      title="The story so far"
      opening={`${BRAND.name} grows the way its stories do: a line at a time. Here's every line we've added, newest first.`}
    >
      <Chapters label="Releases, newest first">
        {RELEASES.map((r, i) => (
          <Chapter key={r.title} n={RELEASES.length - i} title={r.title}>
            <div className="flex items-start gap-4">
              <TourArt name={r.art} size={48} />
              <div className="min-w-0">
                <p className="text-xs font-medium text-faint">
                  <time dateTime={r.date}>{day(r.date)}</time>
                </p>
                <p className="mt-1 font-serif text-[17px] leading-relaxed text-ink">{r.line}</p>
              </div>
            </div>
            <ul>
              {r.changes.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          </Chapter>
        ))}
      </Chapters>
      <TheEnd>
        <Link href="/" className="btn-primary">
          Back to the stories
        </Link>
      </TheEnd>
    </StoryPage>
  );
}
