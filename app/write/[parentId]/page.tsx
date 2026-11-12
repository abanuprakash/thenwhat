import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { canWrite, getEntitlements, getLine, getViewer, hasFeature } from "@/lib/queries";
import { Locked } from "@/components/Locked";
import { getCapacity, getMyPendingKinds } from "@/lib/dashboard-queries";
import { describeCapacity } from "@/lib/limits";
import { Composer } from "@/components/Composer";
import { LimitNotice } from "@/components/LimitNotice";

export const metadata: Metadata = { title: "Then what?" };

export default async function WritePage({ params }: { params: Promise<{ parentId: string }> }) {
  const { parentId } = await params;
  const parent = await getLine(parentId).catch(() => null);
  if (!parent) notFound();
  const supabase = await createClient();
  const [{ data: story }, viewer, capRaw] = await Promise.all([
    supabase.from("stories").select("slug, title").eq("id", parent.story_id).single(),
    getViewer(),
    getCapacity(parentId),
  ]);
  if (!story) notFound();
  const cap = describeCapacity(capRaw);
  const [pendingKinds, ent] = await Promise.all([getMyPendingKinds(viewer, parentId), getEntitlements()]);

  return (
    <div className="container-narrow">
      <Link href={`/s/${story.slug}/${parentId}`} className="text-[13px] font-medium">
        ← Back
      </Link>
      <h1 className="mb-5 mt-[14px] font-serif text-2xl font-semibold">
        Then what<span className="text-gold">?</span>
      </h1>
      <div className="panel mb-5 px-5 py-[18px]">
        <div className="eyebrow mb-2 !text-[10px]">So far</div>
        <p className="mb-[6px] font-serif text-base leading-[1.55] text-ink">{parent.text}</p>
        <span className="text-[11px] font-medium text-faint">by @{parent.author?.handle}</span>
      </div>

      {!hasFeature(ent, "write_lines") ? (
        <Locked feature="Writing lines" />
      ) : parent.status !== "published" ? (
        <p className="text-sm text-faint">This line is still waiting for approval, so it can&apos;t be continued yet.</p>
      ) : parent.is_complete ? (
        <p className="text-sm text-faint">This path has been marked complete, so it can&apos;t be continued.</p>
      ) : cap && !cap.canContinue ? (
        <LimitNotice cap={cap} lineId={parentId} writer={canWrite(viewer) && hasFeature(ent, "request_more")} pendingKinds={pendingKinds} />
      ) : (
        <>
          {cap && (cap.branch_limit !== null || cap.max_depth !== null) && (
            <ul className="mb-4 space-y-1 text-xs text-muted" aria-label="Limits for this line">
              {cap.max_depth !== null && (
                <li>
                  {cap.nextIsFinal ? (
                    <strong className="text-ink">
                      This will be line {cap.lineNumber + 1} of {cap.max_depth}, the last one on this path. Make it an ending.
                    </strong>
                  ) : (
                    <>
                      This will be line {cap.lineNumber + 1} of {cap.max_depth} on this path.
                    </>
                  )}
                </li>
              )}
              {cap.branchesLeft !== null && (
                <li>
                  {cap.branchesLeft === 1
                    ? "This is the last branch this line allows."
                    : `${cap.branchesLeft} of ${cap.branch_limit} branches still open under this line.`}
                </li>
              )}
            </ul>
          )}
          <Composer parentId={parentId} />
        </>
      )}
    </div>
  );
}
