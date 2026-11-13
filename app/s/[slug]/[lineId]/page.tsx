import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  BRANCH_PAGE,
  canWrite,
  getAncestors,
  getBranches,
  getLine,
  getMyVotes,
  getStoryBySlug,
  getSubtree,
  getEntitlements,
  getLiveUpdates,
  getViewer,
  hasFeature,
  isFollowing,
} from "@/lib/queries";
import { LineReview } from "@/components/dashboard/LineReview";
import { truncate, plural } from "@/lib/format";
import { VoteControl } from "@/components/VoteControl";
import { FollowButton } from "@/components/FollowButton";
import { MiniTree } from "@/components/MiniTree";
import { LiveRefresh } from "@/components/LiveRefresh";
import { MarkCompleteButton, ReportButton } from "@/components/LineActions";
import { LimitNotice } from "@/components/LimitNotice";
import { getCapacity, getMyPendingKinds } from "@/lib/dashboard-queries";
import { describeCapacity } from "@/lib/limits";

type Props = {
  params: Promise<{ slug: string; lineId: string }>;
  searchParams: Promise<{ show?: string }>;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, lineId } = await params;
  const story = await getStoryBySlug(slug);
  const line = UUID.test(lineId) ? await getLine(lineId) : null;
  if (!story || !line) return {};
  return { title: story.title, description: truncate(line.text, 160) };
}

export default async function ReadingPage({ params, searchParams }: Props) {
  const { slug, lineId } = await params;
  const { show: rawShow } = await searchParams;
  if (!UUID.test(lineId)) notFound();

  const [story, line, viewer] = await Promise.all([getStoryBySlug(slug), getLine(lineId), getViewer()]);
  if (!story || !line || line.story_id !== story.id) notFound();

  const show = Math.min(Math.max(Number(rawShow) || BRANCH_PAGE, BRANCH_PAGE), 100);
  const treeLevels = Math.min(line.depth + 2, 8);

  const [ancestors, { branches, hasMore }, following, tree, capRaw, pendingKinds, ent, live] = await Promise.all([
    getAncestors(lineId),
    getBranches(lineId, show),
    isFollowing(viewer, story.id),
    story.root_line_id ? getSubtree(story.root_line_id, treeLevels) : Promise.resolve([]),
    getCapacity(lineId),
    getMyPendingKinds(viewer, lineId),
    getEntitlements(),
    getLiveUpdates(),
  ]);
  const cap = describeCapacity(capRaw);
  const myVotes = await getMyVotes(viewer, [lineId, ...branches.map((b) => b.id)]);

  const writer = canWrite(viewer);
  const isStarter = viewer?.id === story.author_id || viewer?.profile.role === "admin";
  const active = story.status !== "inactive";
  const published = line.status === "published";
  const canMarkComplete = isStarter && active && published && line.children === 0 && !line.is_complete && branches.every((b) => b.status === "rejected");
  const can = (f: string) => hasFeature(ent, f);
  const isAdmin = viewer?.profile.role === "admin";
  const canReviewHere = isAdmin || (viewer?.id === story.author_id && can("approvals"));
  const isMine = viewer?.id === line.author_id;
  const canEdit =
    isMine && active && can("edit_lines") && !line.hidden && line.children === 0 && branches.every((b) => b.status === "rejected");
  const canContinue = writer && (cap?.canContinue ?? false);
  const pathIds = new Set(ancestors.map((a) => a.id));
  // Keep the sidebar readable: only the path plus each path line's direct branches.
  const miniLines = tree.filter((l) => !l.parent_id || pathIds.has(l.parent_id) || pathIds.has(l.id));

  return (
    <div className="mx-auto w-full max-w-[1100px] px-4 pb-24 pt-8 desk:px-6">
      {/* Live updates: only here, on the reading page, and only when switched on in Dashboard → Settings. */}
      {live.on && <LiveRefresh storyId={story.id} seconds={live.seconds} />}

      {!active && (
        <div role="status" className="mb-5 rounded-[3px] border border-black/10 bg-chip px-4 py-3 text-sm text-ink">
          <strong>This story is inactive.</strong> Readers can&apos;t see it and nobody can add lines.
          {story.status_reason && <> Reason: {story.status_reason}.</>}{" "}
          <Link href="/dashboard/stories?status=inactive">Manage in the dashboard</Link>
        </div>
      )}

      <div className="mb-[18px] flex flex-wrap items-center justify-between gap-4">
        <nav aria-label="Your path through the story" className="flex flex-wrap items-center gap-[6px]">
          {ancestors.map((a, i) => {
            const current = a.id === lineId;
            return (
              <span key={a.id} className="flex items-center gap-[6px]">
                <Link
                  href={`/s/${slug}/${a.id}`}
                  aria-current={current ? "page" : undefined}
                  className={`rounded-full px-[10px] py-1 text-xs transition-colors duration-200 ${
                    current ? "bg-cream font-semibold text-ink" : "bg-chip font-medium text-faint"
                  } hover:text-ink`}
                >
                  {i === 0 ? story.title : truncate(a.text, 22)}
                </Link>
                {i < ancestors.length - 1 && <span aria-hidden="true" className="text-[11px] text-[#A89C7E]">›</span>}
              </span>
            );
          })}
        </nav>
        <div className="flex items-center gap-[10px]">
          <Link href={`/s/${slug}/${lineId}/full`} className="btn-secondary">
            Read full story from here
          </Link>
          <FollowButton storyId={story.id} initial={following} signedIn={!!viewer} allowed={can("follow")} variant="button" />
        </div>
      </div>

      <div className="flex flex-wrap items-start gap-7">
        <div className="min-w-0 flex-1 basis-[340px]">
          <article key={line.id} className="card animate-fade px-5 py-6 desk:px-7 desk:py-[26px]">
            {line.status === "pending" && (
              <p role="status" className="mb-3 rounded-[2px] bg-cream px-2 py-1 text-xs text-ink">
                <strong>Waiting for approval.</strong> Only you, the story&apos;s starter and admins can see this line until it&apos;s approved.
              </p>
            )}
            {line.status === "rejected" && (
              <p role="status" className="mb-3 rounded-[2px] bg-[#F4E1DC] px-2 py-1 text-xs text-[#7A2E1C]">
                <strong>Not published.</strong> {line.review_note ? `Note from the reviewer: “${line.review_note}”.` : ""} You can edit it and send it again.
              </p>
            )}
            {line.pending_text && (isMine || canReviewHere) && (
              <div className="mb-3 rounded-[2px] bg-cream px-3 py-2 text-xs text-ink">
                <strong>Edit waiting for approval:</strong>
                <p className="mt-1 font-serif text-sm">{line.pending_text}</p>
              </div>
            )}
            {line.hidden && (
              <p className="mb-3 rounded-[2px] bg-chip px-2 py-1 text-xs text-muted">
                This line is hidden after reports. Only you and admins can see it.
              </p>
            )}
            {line.is_complete && (
              <div className="badge-gold mb-3 !text-[10px] !tracking-[.04em]">The end, on this path</div>
            )}
            {!line.is_complete && cap?.atMaxDepth && (
              <div className="badge-gold mb-3 !text-[10px] !tracking-[.04em]">Final line on this path</div>
            )}
            <p className="mb-4 font-serif text-[20px] leading-[1.6] text-ink desk:text-[22px]">{line.text}</p>
            <div className="flex flex-wrap items-center justify-between gap-[10px]">
              <span className="text-xs font-medium text-faint">
                by <Link href={`/u/${line.author?.handle}`}>@{line.author?.handle}</Link>
                {line.depth > 0 && <> · line {line.depth + 1}</>}
              </span>
              <div className="flex items-center gap-4">
                {canEdit && (
                  <Link href={`/edit/${line.id}`} className="text-[11px] font-medium text-faint hover:text-ink">
                    Edit
                  </Link>
                )}
                {published && can("report") && !isMine && <ReportButton lineId={line.id} signedIn={!!viewer} />}
                {published && (
                  <VoteControl lineId={line.id} up={line.up} down={line.down} mine={myVotes[line.id] ?? 0} signedIn={!!viewer} allowed={can("vote")} />
                )}
              </div>
            </div>
            {canMarkComplete && <MarkCompleteButton lineId={line.id} slug={slug} />}
            {canReviewHere && active && (line.status === "pending" || line.pending_text) && (
              <div className="mt-4 border-t border-black/[.06] pt-4">
                <LineReview lineId={line.id} writer={line.author?.handle} text={line.pending_text ?? line.text} isEdit={line.status === "published" && !!line.pending_text} idPrefix="page" />
              </div>
            )}
          </article>

          <section className="mt-[22px]" aria-labelledby="branches-heading">
            <div className="mb-[10px] flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <h2 id="branches-heading" className="eyebrow">
                Then what<span className="text-gold">?</span> <span className="font-medium normal-case tracking-normal">· ranked by readers</span>
              </h2>
              {cap && (cap.branch_limit !== null || cap.max_depth !== null) && (
                <p className="text-[11px] font-medium text-faint">
                  {cap.branch_limit !== null && (
                    <>
                      {Math.min(cap.children, cap.branch_limit)} of {cap.branch_limit} branches used
                    </>
                  )}
                  {cap.branch_limit !== null && cap.max_depth !== null && " · "}
                  {cap.max_depth !== null && (
                    <>
                      line {cap.lineNumber} of {cap.max_depth}
                    </>
                  )}
                </p>
              )}
            </div>
            {branches.length > 0 ? (
              <>
                <ol className="flex flex-col gap-px overflow-hidden rounded-[3px] border border-black/[.08] bg-black/[.08]">
                  {branches.map((b, i) => (
                    <li
                      key={b.id}
                      style={{ "--i": i } as React.CSSProperties}
                      className={`animate-stagger group relative flex items-start gap-[14px] px-4 py-[14px] transition-[background-color,box-shadow] duration-200 ${
                        b.status === "published"
                          ? "bg-white hover:bg-[#FFFDF8] hover:shadow-[inset_3px_0_0_#D9A441]"
                          : "bg-[#FBF8F2]"
                      }`}
                    >
                      <div className="relative z-10 w-[38px] flex-none pt-[2px]">
                        {b.status === "published" ? (
                          <VoteControl
                            lineId={b.id}
                            up={b.up}
                            down={b.down}
                            mine={myVotes[b.id] ?? 0}
                            signedIn={!!viewer}
                            allowed={can("vote")}
                            layout="column"
                          />
                        ) : (
                          <span aria-hidden="true" className="block text-center text-xs text-faint">
                            –
                          </span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/s/${slug}/${b.id}`}
                          className="m-0 block font-serif text-[15.5px] leading-normal text-ink after:absolute after:inset-0 after:content-[''] hover:text-ink"
                        >
                          {b.text}
                        </Link>
                        <span className="text-[11px] font-medium text-faint">
                          by @{b.author?.handle}
                          {b.status === "pending" && <span className="font-semibold text-gold"> · waiting for approval</span>}
                          {b.status === "rejected" && <span className="font-semibold text-[#7A2E1C]"> · not published</span>}
                          {b.children > 0 && <> · {plural(b.children, "branch", "branches")}</>}
                          {(b.is_complete || (cap?.max_depth != null && b.depth + 1 >= cap.max_depth)) && <> · ending</>}
                        </span>
                      </div>
                    </li>
                  ))}
                </ol>
                <div className="mt-[14px] flex flex-wrap items-center justify-between gap-3">
                  {hasMore ? (
                    <Link href={`/s/${slug}/${lineId}?show=${show + BRANCH_PAGE}`} scroll={false} className="text-xs font-medium">
                      Show more branches
                    </Link>
                  ) : show > BRANCH_PAGE ? (
                    <Link href={`/s/${slug}/${lineId}`} scroll={false} className="text-xs font-medium">
                      Show fewer branches
                    </Link>
                  ) : (
                    <span />
                  )}
                  {canContinue && (
                    <Link href={`/write/${lineId}`} className="btn-primary">
                      Your turn: write what happens
                    </Link>
                  )}
                </div>
              </>
            ) : (
              <div>
                <p className="px-1 py-[22px] text-sm text-faint">
                  {line.is_complete || cap?.atMaxDepth
                    ? "The end. Or is it? Go back up the path to see where else this story went."
                    : !active
                      ? "No branches yet."
                      : "Nobody knows what happens next. Yet."}
                </p>
                {canContinue && (
                  <Link href={`/write/${lineId}`} className="btn-primary mt-[6px]">
                    Your turn: write what happens
                  </Link>
                )}
              </div>
            )}
            {cap && <LimitNotice cap={cap} lineId={lineId} writer={writer && can("request_more")} pendingKinds={pendingKinds} />}
            {canContinue && cap?.nextIsFinal && (
              <p className="mt-3 text-xs text-faint">The next line written here will be the last on this path.</p>
            )}
            {!writer && cap?.canContinue && (
              <p className="mt-4 text-xs text-faint">
                Only verified authors can write.{" "}
                {viewer ? <Link href="/become-author">How to become one</Link> : <Link href={`/login?next=/s/${slug}/${lineId}`}>Sign in</Link>}
              </p>
            )}
          </section>
        </div>

        <aside className="flex w-full flex-none flex-col gap-[14px] desk:sticky desk:top-20 desk:w-[230px]">
          <div className="panel border border-black/[.06] p-4">
            <h2 className="eyebrow mb-[10px] !text-[10px]">Your path</h2>
            <MiniTree lines={miniLines} pathIds={pathIds} currentId={lineId} slug={slug} />
            <p className="mt-2 text-[11px] font-medium text-faint">
              Line {line.depth + 1} · {plural(story.line_count, "line")} in this story
            </p>
          </div>
          <Link href={`/s/${slug}/tree?at=${lineId}`} className="btn-secondary !py-[10px]">
            View full tree map
          </Link>
        </aside>
      </div>
    </div>
  );
}
