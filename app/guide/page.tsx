import type { Metadata } from "next";
import Link from "next/link";
import { GUIDE_CHAPTERS, GuideBody } from "@/components/guide/GuideBody";
import { StoryPage, TheEnd } from "@/components/StoryPage";
import { BRAND } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Every feature, explained",
  description: `A guide to everything you can do on ${BRAND.name}, with pictures: reading, writing, voting, approvals, plans, the dashboard and more.`,
};

export default function GuidePage() {
  return (
    <StoryPage
      wide
      eyebrow="The guide"
      title="Every feature, explained"
      opening={
        <>
          Stories here grow one line at a time. Anyone can read; invited writers add the next line, any line can branch, and
          readers&apos; votes lift the best paths to the top. Here&apos;s everything you can do, in the order you&apos;d meet it.{" "}
          <em className="text-ink">You decide what happens next.</em>
        </>
      }
      meta="Pictures show the demo stories. New here? Each page also has a short tour behind the ? at the top."
    >
      <nav aria-labelledby="guide-contents" className="panel mb-10 border border-black/[.06] px-5 py-[18px]">
        <h2 id="guide-contents" className="eyebrow mb-3">
          In this guide
        </h2>
        <ol className="grid gap-x-6 gap-y-1.5 text-sm desk:grid-cols-2">
          {GUIDE_CHAPTERS.map((c, i) => (
            <li key={c.id} className="flex gap-2">
              <span className="w-5 flex-none text-right text-xs font-semibold leading-5 text-faint">{i + 1}</span>
              <a href={`#${c.id}`} className="font-medium text-ink hover:text-gold">
                {c.title}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <GuideBody />

      <TheEnd>
        <Link href="/" className="btn-primary">
          Start reading
        </Link>
        <Link href="/become-author" className="btn-secondary">
          How to become an author
        </Link>
      </TheEnd>
    </StoryPage>
  );
}
