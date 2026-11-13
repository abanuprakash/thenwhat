import type { Metadata } from "next";
import { IntentLink } from "@/components/IntentLink";
import { getEntitlements, getViewer, hasFeature } from "@/lib/queries";
import { getReviewQueue, pageFrom, PAGE_SIZE } from "@/lib/dashboard-queries";
import { Empty, FilterBar, Pagination, SelectField } from "@/components/dashboard/ui";
import { LineReview } from "@/components/dashboard/LineReview";
import { timeAgo } from "@/lib/format";

export const metadata: Metadata = { title: "Review" };

export default async function ReviewPage({ searchParams }: { searchParams: Promise<{ mine?: string; page?: string }> }) {
  const sp = await searchParams;
  const viewer = (await getViewer())!;
  const isAdmin = viewer.profile.role === "admin";
  const mine = sp.mine === "1";
  const page = pageFrom(sp.page);
  const [{ rows, total }, ent] = await Promise.all([getReviewQueue(viewer, mine, page), getEntitlements()]);
  const canApproveOwn = hasFeature(ent, "approvals");

  return (
    <div>
      <p className="mb-4 max-w-[680px] text-sm leading-relaxed text-muted">
        New lines and edits wait here when a story holds them for approval. Nothing below is visible to readers until it&apos;s
        approved.{" "}
        {isAdmin
          ? "As an admin you can review any story."
          : canApproveOwn
            ? "You review lines in stories you started."
            : "Your plan doesn't include approvals, so an admin reviews lines in your stories. You can still see what's waiting."}
      </p>
      <FilterBar action="/dashboard/review">
        <SelectField
          id="mine"
          label="Show"
          name="mine"
          value={mine ? "1" : ""}
          options={[
            { value: "", label: isAdmin ? "Everything waiting" : "On my stories + mine" },
            { value: "1", label: "Only my lines" },
          ]}
        />
      </FilterBar>

      {rows.length === 0 ? (
        <Empty>Nothing waiting for approval.</Empty>
      ) : (
        <ul className="space-y-3">
          {rows.map((l) => {
            const isEdit = l.status === "published" && l.pending_text !== null;
            const isMine = l.author_id === viewer.id;
            const canDecide = isAdmin || (l.story?.author_id === viewer.id && canApproveOwn);
            return (
              <li key={l.id} className="card p-4">
                <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-faint">
                  <span className="rounded-full bg-cream px-2 py-[2px] text-[10px] font-semibold uppercase tracking-[.03em] text-gold">
                    {isEdit ? "Edit" : "New line"}
                  </span>
                  <span>
                    {isMine ? "you" : `@${l.author?.handle}`} · {timeAgo(isEdit && l.pending_text_at ? l.pending_text_at : l.created_at)}
                  </span>
                  {l.story && (
                    <>
                      <span>· in</span>
                      <IntentLink href={`/s/${l.story.slug}/${l.parent_id ?? l.id}`}>{l.story.title}</IntentLink>
                    </>
                  )}
                </div>
                {l.parent && !isEdit && (
                  <p className="mb-2 border-l-2 border-line pl-3 font-serif text-sm text-muted">
                    <span className="sr-only">Continuing: </span>
                    {l.parent.text}
                  </p>
                )}
                {isEdit ? (
                  <div className="mb-3 space-y-2">
                    <p className="font-serif text-[15px] text-muted line-through decoration-black/30">
                      <span className="sr-only">Current text: </span>
                      {l.text}
                    </p>
                    <p className="font-serif text-[15px] text-ink">
                      <span className="sr-only">Proposed text: </span>
                      {l.pending_text}
                    </p>
                  </div>
                ) : (
                  <p className="mb-3 font-serif text-[15px] leading-normal text-ink">{l.text}</p>
                )}
                {canDecide ? (
                  <LineReview lineId={l.id} writer={l.author?.handle} text={isEdit ? (l.pending_text ?? l.text) : l.text} isEdit={isEdit} />
                ) : (
                  <p className="text-xs text-faint">{isMine ? "Waiting for the story's starter or an admin." : "Waiting for an admin."}</p>
                )}
              </li>
            );
          })}
        </ul>
      )}
      <Pagination page={page} total={total} pageSize={PAGE_SIZE} basePath="/dashboard/review" params={{ mine: mine ? "1" : undefined }} />
    </div>
  );
}
