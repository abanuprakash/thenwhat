import type { Metadata } from "next";
import Link from "next/link";
import { Chapter, Chapters, Contact, InShort, Short, StoryPage, TheEnd } from "@/components/StoryPage";
import { BRAND, OPERATOR } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Privacy policy",
  description: `What ${BRAND.name} knows about you, why, who helps us run it, and what you can ask us to do.`,
};

export default function PrivacyPage() {
  return (
    <StoryPage
      eyebrow="Privacy policy"
      title="The story of your data"
      opening="Every good story has a few characters you need to keep track of. Here are ours: what we know about you, why we know it, and what happens to it."
      meta={`Last updated ${OPERATOR.legalUpdated}. ${BRAND.name} is run by ${OPERATOR.by} in ${OPERATOR.city}, India.`}
    >
      <InShort>
        <Short>We know what you give us: your email and name from signing in, your profile, and what you write, vote on and follow.</Short>
        <Short>Your lines and profile are public. Your email, votes and follows are not.</Short>
        <Short>No ads, no selling data, no tracking you around the web. Our analytics count page views without cookies.</Short>
        <Short>A few companies help us run the site: Supabase, Vercel, Google, and Cloudflare if bot checks are on.</Short>
        <Short>
          You can change or remove your profile details any time, and ask us to delete your account at <Contact />.
        </Short>
      </InShort>

      <Chapters label="The story of your data">
        <Chapter n={1} title="You arrive" line="A reader walks in. We don't know who they are, and we don't try to find out.">
          <p>
            You can read every published story without an account. As a guest, the only thing we keep is in your own browser: which
            guided tours you&apos;ve already seen, so they don&apos;t repeat.
          </p>
        </Chapter>

        <Chapter n={2} title="You sign in" line="The reader decides to stay. They tell us their name, and we write it down carefully.">
          <p>When you sign in with Google (or with an email link, if it&apos;s switched on), we receive:</p>
          <ul>
            <li>your email address, to sign you in and reach you about your account;</li>
            <li>your name and profile photo from Google, which you can use on your profile or replace.</li>
          </ul>
          <p>
            Then you choose a <strong>handle</strong>, and can add a display name, a short bio and a photo you upload. Uploaded
            photos are resized and stored as images; nothing else is read from them.
          </p>
          <p>
            Your email is never shown to anyone else. Signing in sets a few cookies that keep you signed in; they can&apos;t be read
            by scripts in the page, and they&apos;re the only cookies we use.
          </p>
        </Chapter>

        <Chapter n={3} title="You write, vote and follow" line="Every line you add becomes part of a story others can read, and continue.">
          <ul>
            <li>
              <strong>Lines and stories</strong> you write are public, with your handle on them. Lines waiting for approval are seen
              only by you, the story&apos;s starter and admins until they&apos;re approved.
            </li>
            <li>
              <strong>Votes</strong> are private: others see the totals, never who voted which way.
            </li>
            <li>
              <strong>Follows</strong> are private to you.
            </li>
            <li>
              <strong>Reports and requests</strong> you send (reporting a line, asking for more branches) are seen by the people who
              handle them: the story&apos;s starter and admins.
            </li>
          </ul>
        </Chapter>

        <Chapter n={4} title="We keep the lights on" line="Behind every story, someone quietly checks the doors are locked and the floors are swept.">
          <ul>
            <li>
              <strong>An activity log</strong> records actions like approving, rejecting, hiding or inviting, with who did them and
              when. Admins and story starters see it for their stories. It helps us keep things fair.
            </li>
            <li>
              <strong>Rate limits</strong> count recent actions per account or per network address, so nobody can flood the site.
              These counts are deleted within two days.
            </li>
            <li>
              <strong>Tours you&apos;ve seen</strong> are stored on your profile, so they don&apos;t repeat on another device.
            </li>
          </ul>
        </Chapter>

        <Chapter n={5} title="We count, but we don't follow" line="We like to know how many people turned the page. We don't need to know who they were.">
          <p>
            We use Vercel Web Analytics to count page views and Vercel Speed Insights to measure how fast pages load for a sample of
            visits. Neither uses cookies or follows you to other sites. Before anything is sent, we strip the address down: no query
            strings, sign-in pages skipped entirely, and invite links counted without their code.
          </p>
        </Chapter>

        <Chapter n={6} title="The people who help us" line="No story is written alone, and no website runs alone either.">
          <ul>
            <li>
              <strong>Supabase</strong> stores the database, handles sign-in and keeps uploaded photos.
            </li>
            <li>
              <strong>Vercel</strong> hosts the site and provides the analytics above.
            </li>
            <li>
              <strong>Google</strong> signs you in when you choose &ldquo;Continue with Google&rdquo;.
            </li>
            <li>
              <strong>Cloudflare Turnstile</strong> checks that a sign-in is a person, not a bot, when it&apos;s switched on.
            </li>
          </ul>
          <p>
            They process data on our behalf, only to provide their service, and their servers may be outside India. We don&apos;t
            sell your data, show ads, or share it with anyone else, unless the law requires us to.
          </p>
        </Chapter>

        <Chapter n={7} title="It's your story too" line="You can always edit your own lines in this story, or ask to leave it.">
          <ul>
            <li>Change your name, bio and photo, or remove your photo, from your profile at any time.</li>
            <li>
              Ask us for a copy of what we hold about you, to correct it, or to delete your account, by writing to <Contact />.
            </li>
            <li>
              Deleting an account removes your profile, votes, follows and lines. Because stories branch, removing a line can also
              remove the lines others wrote after it, so we&apos;ll tell you what would go before we do it.
            </li>
          </ul>
          <p>We keep your data while your account exists, and delete it when you ask us to, unless the law says we must keep something.</p>
        </Chapter>

        <Chapter n={8} title="A note for younger readers" line="Some readers are still writing their first chapters.">
          <p>If you&apos;re under 18, please use {BRAND.name} with a parent&apos;s or guardian&apos;s permission.</p>
        </Chapter>

        <Chapter n={9} title="When this story changes" line="Like every story here, this one may grow a new line.">
          <p>
            If we change how we handle your data, we&apos;ll update this page and its date, and note it in the{" "}
            <Link href="/changelog">changelog</Link>. For big changes, we&apos;ll tell you on the site first.
          </p>
        </Chapter>
      </Chapters>

      <TheEnd>
        <Link href="/terms" className="btn-secondary">
          Read the house rules
        </Link>
        <Link href="/" className="btn-primary">
          Back to the stories
        </Link>
      </TheEnd>
    </StoryPage>
  );
}
