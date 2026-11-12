import type { Metadata } from "next";
import Link from "next/link";
import { getViewer } from "@/lib/queries";

export const metadata: Metadata = { title: "Become an author" };

export default async function BecomeAuthorPage() {
  const viewer = await getViewer();
  return (
    <div className="container-narrow">
      <h1 className="mb-3 font-serif text-2xl font-semibold">Writing is invite-only</h1>
      <p className="mb-4 text-sm leading-relaxed text-muted">
        Anyone can read, vote and follow stories. To write lines and start stories you need to be a verified author,
        and the only way in is an invite link from someone who already is one.
      </p>
      <p className="text-sm leading-relaxed text-muted">
        {viewer ? (
          <>Got a link? Open it while signed in as @{viewer.profile.handle} and you&apos;re in.</>
        ) : (
          <>
            <Link href="/login">Sign in</Link> first, then open your invite link.
          </>
        )}
      </p>
      <Link href="/" className="btn-secondary mt-6">
        Back to stories
      </Link>
    </div>
  );
}
