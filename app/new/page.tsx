import type { Metadata } from "next";
import Link from "next/link";
import { NewStoryForm } from "@/components/NewStoryForm";
import { getSettings } from "@/lib/dashboard-queries";
import { getEntitlements, hasFeature } from "@/lib/queries";
import { Locked } from "@/components/Locked";
import { PageTour } from "@/components/Tour";

export const metadata: Metadata = { title: "Start a story" };

export default async function NewStoryPage() {
  const [settings, ent] = await Promise.all([getSettings(), getEntitlements()]);
  const quota = ent?.features.start_stories?.quota ?? null;
  const left = quota === null ? null : Math.max(quota - (ent?.stories_started ?? 0), 0);
  const b = settings.max_branches_per_line;
  const d = settings.max_depth;
  return (
    <div className="container-narrow">
      <PageTour id="new" />
      <Link href="/" className="text-[13px] font-medium">
        ← Back to home
      </Link>
      <h1 className="mb-3 mt-[14px] font-serif text-2xl font-semibold">
        Once upon a line<span className="text-gold">…</span>
      </h1>
      {(b !== null || d !== null) && (
        <p className="panel mb-6 px-4 py-3 text-xs leading-relaxed text-muted">
          <strong className="text-ink">Story rules:</strong>{" "}
          {b !== null && <>each line can have up to {b} {b === 1 ? "branch" : "branches"}</>}
          {b !== null && d !== null && " and "}
          {d !== null && <>every path ends after {d} lines</>}. Writers can ask for more room if a story needs it.
        </p>
      )}
      {b === null && d === null && <div className="mb-6" />}
      {!hasFeature(ent, "start_stories") ? (
        <Locked feature="Starting stories" />
      ) : left === 0 ? (
        <Locked feature={`More than ${quota} stories`} />
      ) : (
        <>
          {left !== null && (
            <p className="mb-4 text-xs text-faint">
              You can start {left} more {left === 1 ? "story" : "stories"} on your {ent?.plan_name} plan.
            </p>
          )}
          {!settings.auto_approve && (
            <p className="mb-4 text-xs text-faint">Lines other people add to your story wait for approval before readers see them.</p>
          )}
          <NewStoryForm />
        </>
      )}
    </div>
  );
}
