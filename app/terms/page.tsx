import type { Metadata } from "next";
import Link from "next/link";
import { Chapter, Chapters, Contact, InShort, Short, StoryPage, TheEnd } from "@/components/StoryPage";
import { BRAND, OPERATOR } from "@/lib/brand";
import { LINE_MAX } from "@/lib/schemas";

export const metadata: Metadata = {
  title: "Terms and conditions",
  description: `The house rules for reading and writing on ${BRAND.name}.`,
};

export default function TermsPage() {
  return (
    <StoryPage
      eyebrow="Terms and conditions"
      title="The house rules"
      opening="Every shared story needs a few rules, so everyone can keep writing. These are ours, told the only way we know how."
      meta={`Last updated ${OPERATOR.legalUpdated}. ${BRAND.name} is run by ${OPERATOR.by} in ${OPERATOR.city}, India ("we", "us").`}
    >
      <InShort>
        <Short>By reading or writing here, you agree to these rules and our privacy policy.</Short>
        <Short>Your lines stay yours. You let us show them, and let others continue from them, because that&apos;s what this place is.</Short>
        <Short>Be kind, write your own words, and keep it legal. Starters and admins can hold, hide or remove lines.</Short>
        <Short>We do our best to keep things running, but the site comes as it is.</Short>
        <Short>Indian law applies, and the courts in Chennai.</Short>
      </InShort>

      <Chapters label="The house rules">
        <Chapter n={1} title="Opening the book" line="By turning this page, you've joined the story. Welcome.">
          <p>
            These terms apply whenever you use {BRAND.name}, whether you&apos;re reading as a guest or writing with an account. If you
            don&apos;t agree with them, please don&apos;t use the site. Our <Link href="/privacy">privacy policy</Link> explains what
            we do with your data and is part of these terms.
          </p>
        </Chapter>

        <Chapter n={2} title="Your account" line="Every character needs a name. Yours is your handle, and it should be yours alone.">
          <ul>
            <li>One account per person. Keep your sign-in safe; what happens on your account is your responsibility.</li>
            <li>Pick a handle that isn&apos;t pretending to be someone else, or offensive. We can ask you to change one that is.</li>
            <li>If you&apos;re under 18, use {BRAND.name} with a parent&apos;s or guardian&apos;s permission.</li>
          </ul>
        </Chapter>

        <Chapter n={3} title="Your words" line="The line you write is yours. The moment you share it, it becomes a place others can start from.">
          <p>You own what you write. By posting a line or starting a story, you give us permission to:</p>
          <ul>
            <li>show it on {BRAND.name}, with your handle, in any story it&apos;s part of;</li>
            <li>let others read it, vote on it, and write lines that continue from it;</li>
            <li>arrange it with other people&apos;s lines into paths, full-story views and tree maps.</li>
          </ul>
          <p>
            This permission is free and worldwide, and lasts while your line is on the site. Lines that others have continued from
            may stay to keep their stories whole, unless you ask us to remove them (see the{" "}
            <Link href="/privacy">privacy policy</Link>).
          </p>
        </Chapter>

        <Chapter n={4} title="Writing well together" line="Every line is someone else's next beginning. Write one you'd be glad to continue.">
          <p>Each line can be up to {LINE_MAX} characters. Please don&apos;t post anything that:</p>
          <ul>
            <li>harasses, threatens or demeans a person or group, or reveals someone&apos;s private details;</li>
            <li>is sexual content involving minors, or promotes violence, self-harm or anything illegal;</li>
            <li>copies someone else&apos;s writing, lyrics or other work you don&apos;t have the right to use;</li>
            <li>is spam, advertising, or an attempt to break, overload or get around the site&apos;s limits.</li>
          </ul>
          <p>
            Stories are fiction, written by many hands. A character can be a villain; a line shouldn&apos;t be aimed at a real person.
          </p>
        </Chapter>

        <Chapter n={5} title="Keeping the thread" line="Even the wildest story has someone keeping an eye on the plot.">
          <ul>
            <li>Some stories hold new lines for approval by the story&apos;s starter or an admin before they appear.</li>
            <li>
              Starters and admins can reject, hide or remove lines, and admins can pause stories, change limits, or suspend accounts
              that break these rules, with or without notice.
            </li>
            <li>Anyone signed in can report a line. Reports go to the people who look after that story.</li>
          </ul>
        </Chapter>

        <Chapter n={6} title="Plans and invites" line="Some doors open with an invite. Some rooms open with a plan.">
          <ul>
            <li>
              Writing is by invite. What you can do (vote, follow, write, start stories, invite others) depends on your plan, as shown
              on <Link href="/pricing">Pricing</Link>. We can change what plans include.
            </li>
            <li>
              We don&apos;t take payments today. If paid plans start, you&apos;ll see the price and terms before you pay anything.
            </li>
            <li>Invite people you trust to write well here; each invite link works once.</li>
          </ul>
        </Chapter>

        <Chapter n={7} title="The fine print" line="Every story has a page nobody wants to read. We kept ours short.">
          <ul>
            <li>
              {BRAND.name} is provided as it is. We work hard to keep it running and your writing safe, but we can&apos;t promise it
              will always be available or free of mistakes. Please keep a copy of anything you can&apos;t bear to lose.
            </li>
            <li>
              Stories are written by our community, not by us, and don&apos;t reflect our views. We aren&apos;t responsible for what
              others write, though we&apos;ll act on reports.
            </li>
            <li>
              As far as the law allows, we aren&apos;t liable for indirect losses, or for losses caused by things outside our control.
            </li>
          </ul>
        </Chapter>

        <Chapter n={8} title="Closing the book" line="You can stop reading any time. Sometimes, so can we.">
          <p>
            You can stop using {BRAND.name} whenever you like, and ask us to delete your account at <Contact />. We can suspend or
            close accounts that break these rules, or close the site with reasonable notice.
          </p>
        </Chapter>

        <Chapter n={9} title="Where the story is set" line={`Every story has a setting. Ours is ${OPERATOR.city}, India.`}>
          <p>
            These terms are governed by the laws of India, and the courts in {OPERATOR.city} have jurisdiction over any dispute about
            them. If one part of these terms can&apos;t be enforced, the rest still applies.
          </p>
        </Chapter>

        <Chapter n={10} title="New chapters" line="Like every story here, these rules may grow a new line.">
          <p>
            If we change these terms, we&apos;ll update this page and its date and note it in the{" "}
            <Link href="/changelog">changelog</Link>. Using {BRAND.name} after a change means you accept the new version. Questions?
            Write to <Contact />.
          </p>
        </Chapter>
      </Chapters>

      <TheEnd>
        <Link href="/privacy" className="btn-secondary">
          Read the privacy policy
        </Link>
        <Link href="/" className="btn-primary">
          Back to the stories
        </Link>
      </TheEnd>
    </StoryPage>
  );
}
