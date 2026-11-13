import type { Metadata } from "next";
import Link from "next/link";
import { Chapter, Chapters, StoryPage, TheEnd } from "@/components/StoryPage";
import { TourArt } from "@/components/TourArt";
import { BRAND, OPERATOR } from "@/lib/brand";

export const metadata: Metadata = {
  title: "About us",
  description: `${BRAND.name} is a place where stories grow one line at a time, and readers decide where they go.`,
};

export default function AboutPage() {
  return (
    <StoryPage
      eyebrow="About us"
      title="Once upon a line"
      opening={
        <>
          Every story you&apos;ve ever loved was, at some point, a single line and a question:{" "}
          <em className="text-ink">then what?</em>
        </>
      }
    >
      <Chapters label="The story of Then What">
        <Chapter
          n={1}
          title="It started with one line"
          line="Someone wrote a sentence and stopped. Not because they'd run out of ideas, but because they wanted to hear yours."
        >
          <p>
            That&apos;s the whole idea of {BRAND.name}. A story begins with an opening line of up to 280 characters. Then someone
            else adds the next one, and the next, and the story grows a line at a time.
          </p>
        </Chapter>

        <Chapter
          n={2}
          title="Then the story split in two"
          line="Two people read the same line and imagined different things. Instead of arguing, they both wrote."
        >
          <div className="flex items-start gap-4">
            <TourArt name="branches" size={52} />
            <p>
              Any line can branch, so a single opening can become dozens of stories. You choose which path to follow, and you can
              always step back and take another one.
            </p>
          </div>
        </Chapter>

        <Chapter
          n={3}
          title="Readers became the editors"
          line="Nobody decided which ending was best. Everyone did, one vote at a time."
        >
          <div className="flex items-start gap-4">
            <TourArt name="vote" size={52} />
            <p>
              Votes lift the strongest branches to the top, so the best paths rise and newcomers find the good stuff first. A single
              early vote can&apos;t crown a winner; it takes readers agreeing.
            </p>
          </div>
        </Chapter>

        <Chapter
          n={4}
          title="The door stays open, with a doorbell"
          line="Anyone can walk in and read. To write, someone who already writes here holds the door for you."
        >
          <div className="flex items-start gap-4">
            <TourArt name="invite" size={52} />
            <p>
              Reading is open to everyone. Writing is by invite, which keeps stories in the hands of people who care about them. Some
              stories also ask for new lines to be approved before they appear, so their starters can keep the thread.
            </p>
          </div>
        </Chapter>

        <Chapter
          n={5}
          title="Who's holding the pen"
          line={`${BRAND.name} is made by ${OPERATOR.by} in ${OPERATOR.city}, one release at a time, much like the stories here.`}
        >
          <p>
            We build it in the open with the people who write on it. Every change we make is in the{" "}
            <Link href="/changelog">changelog</Link>, told the same way as everything else here.
          </p>
        </Chapter>

        <Chapter n={6} title="And now, you" line="This is the part of the story where you come in." />
      </Chapters>

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
