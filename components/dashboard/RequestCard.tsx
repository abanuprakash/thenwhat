import Link from "next/link";
import { StatusPill } from "@/components/dashboard/ui";
import { CancelRequestButton, RequestDecision } from "@/components/dashboard/RequestDecision";
import { timeAgo, truncate } from "@/lib/format";
import type { LimitRequest } from "@/lib/types";

const KIND_LABEL = { more_branches: "More branches on a line", more_depth: "A longer story" } as const;

export function RequestCard({ request: r, viewerId, isAdmin }: { request: LimitRequest; viewerId: string; isAdmin: boolean }) {
  const isMine = r.requester_id === viewerId;
  const canDecide = r.status === "pending" && (isAdmin || (r.story?.author_id === viewerId && !isMine));
  const lineHref = r.story ? `/s/${r.story.slug}/${r.line_id}` : null;
  const headingId = `req-${r.id}`;

  return (
    <article aria-labelledby={headingId} className="card animate-fade p-4">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <StatusPill status={r.status} />
        <h3 id={headingId} className="text-sm font-semibold text-ink">
          {KIND_LABEL[r.kind]}
        </h3>
        <span className="text-xs text-faint">
          · {isMine ? "you" : `@${r.requester?.handle ?? "someone"}`} · {timeAgo(r.created_at)}
        </span>
      </div>

      <p className="mb-2 text-xs text-faint">
        In{" "}
        {r.story ? (
          <Link href={`/s/${r.story.slug}`}>{r.story.title}</Link>
        ) : (
          "a story you can no longer see"
        )}
        {r.line && <> · line {r.line.depth + 1}</>}
      </p>
      {r.line && (
        <blockquote className="mb-3 border-l-2 border-line pl-3 font-serif text-[15px] leading-snug text-ink">
          {lineHref ? (
            <Link href={lineHref} className="text-ink hover:text-gold">
              {truncate(r.line.text, 200)}
            </Link>
          ) : (
            truncate(r.line.text, 200)
          )}
        </blockquote>
      )}
      <p className="mb-3 whitespace-pre-line text-sm leading-relaxed text-muted">
        <span className="sr-only">Their reason: </span>
        {r.message}
      </p>

      {r.status !== "pending" && (
        <p className="text-xs text-faint">
          {r.status === "approved" && <>Approved (+{r.granted}) </>}
          {r.status === "rejected" && <>Declined </>}
          {r.status === "cancelled" && <>Withdrawn </>}
          {r.decider && <>by @{r.decider.handle} </>}
          {r.decided_at && timeAgo(r.decided_at)}
          {r.decision_note && <>: “{r.decision_note}”</>}
        </p>
      )}

      {canDecide && <RequestDecision requestId={r.id} kind={r.kind} requester={r.requester?.handle} storyTitle={r.story?.title} />}
      {r.status === "pending" && isMine && <CancelRequestButton requestId={r.id} />}
      {r.status === "pending" && !canDecide && !isMine && (
        <p className="text-xs text-faint">Waiting for the story&apos;s starter or an admin.</p>
      )}
    </article>
  );
}
