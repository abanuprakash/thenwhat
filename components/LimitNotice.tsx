import Link from "next/link";
import type { CapacityView } from "@/lib/limits";
import type { RequestKind } from "@/lib/types";
import { RequestLimitForm } from "@/components/RequestLimitForm";

/**
 * Tells people why they can't continue a line, and lets authors ask for more room.
 * Shown on the reading page and in place of the composer.
 */
export function LimitNotice({
  cap,
  lineId,
  writer,
  pendingKinds,
}: {
  cap: CapacityView;
  lineId: string;
  writer: boolean;
  pendingKinds: RequestKind[];
}) {
  if (cap.canContinue || cap.is_complete) return null;

  let title: string;
  let body: string;
  let kind: RequestKind | null = null;

  if (cap.inactive) {
    title = "This story is inactive";
    body = "Nobody can add lines while it's inactive.";
  } else if (cap.atMaxDepth) {
    title = "The end of this path";
    body = `This story lets any path run ${cap.max_depth} lines, and this is line ${cap.lineNumber}. Then what? Nothing, unless the story gets more room.`;
    kind = "more_depth";
  } else {
    title = "This line is full of possibilities";
    body = `Each line can grow ${cap.branch_limit} ${cap.branch_limit === 1 ? "branch" : "branches"}, and this one has them all. Pick one below and ask "then what?" there.`;
    kind = "more_branches";
  }

  const pending = kind !== null && pendingKinds.includes(kind);

  return (
    <div className="panel animate-reveal mt-4 px-4 py-4" role="note" aria-label={title}>
      <p className="text-sm font-semibold text-ink">{title}</p>
      <p className="mt-1 text-sm leading-relaxed text-muted">{body}</p>
      {writer && kind && !pending && <RequestLimitForm lineId={lineId} kind={kind} />}
      {pending && (
        <p className="mt-2 text-xs text-faint">
          You&apos;ve asked for more room here. <Link href="/dashboard/requests?mine=1">See your request</Link>
        </p>
      )}
    </div>
  );
}
