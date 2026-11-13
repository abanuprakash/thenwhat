import Link from "next/link";
import { FEED_TABS, getEntitlements, getFeed, getFollowedIds, getViewer, hasFeature, type FeedTab } from "@/lib/queries";
import { FollowButton } from "@/components/FollowButton";
import { FeedTabs } from "@/components/FeedTabs";
import { formatNum, plural } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function HomePage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab: rawTab } = await searchParams;
  const tab: FeedTab = FEED_TABS.some((t) => t.key === rawTab) ? (rawTab as FeedTab) : "trending";
  const viewer = await getViewer();
  const [stories, followed, ent] = await Promise.all([getFeed(tab, viewer), getFollowedIds(viewer), getEntitlements()]);

  return (
    <div className="mx-auto w-full max-w-[760px] px-4 pb-24 pt-9 desk:px-6">
      {viewer && <h1 className="sr-only">Stories</h1>}
      {!viewer && (
        <section className="animate-page mb-8">
          <h1 className="font-serif text-[28px] font-semibold leading-tight desk:text-[32px]">
            Every story here stops at a question<span className="text-gold">.</span>
          </h1>
          <p className="mt-2 max-w-[560px] text-[15px] leading-relaxed text-muted">
            Stories written one line at a time, branching wherever readers take them. Read a line. Then ask:{" "}
            <em className="font-serif text-ink">then what?</em>
          </p>
        </section>
      )}
      <FeedTabs tabs={FEED_TABS.map((t) => ({ key: t.key, label: t.label, href: t.key === "trending" ? "/" : `/?tab=${t.key}` }))} active={tab}>
        <ul className="flex flex-col">
          {stories.map((s, i) => (
            <li
              key={s.id}
              style={{ "--i": i } as React.CSSProperties}
              className="animate-stagger group relative flex items-start gap-[14px] rounded-[3px] border-b border-black/[.06] px-1 py-4 transition-colors duration-200 hover:bg-white/60"
            >
              <div className="flex w-[38px] flex-none flex-col items-center pt-[2px]" aria-label={`${s.vote_count} votes`}>
                <span className="text-xs font-bold text-ink">{formatNum(s.vote_count)}</span>
                <span className="text-[9px] text-faint">votes</span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-2">
                  <Link
                    href={`/s/${s.slug}`}
                    className="font-serif text-base font-semibold text-ink transition-colors after:absolute after:inset-0 after:content-[''] group-hover:text-gold-dark hover:text-gold-dark"
                  >
                    {s.title}
                  </Link>
                  <span className="text-[10px] font-medium tracking-[.02em] text-gold">{s.genre}</span>
                  {s.finished && <span className="badge-muted">Finished</span>}
                </div>
                {s.opening_line && (
                  <p className="mt-1 font-serif text-[13px] leading-normal text-muted">{s.opening_line}</p>
                )}
                <div className="mt-[6px] flex gap-3 text-[11px] font-medium text-faint">
                  <span>{plural(Math.max(s.line_count - 1, 0), "branch", "branches")}</span>
                  <span>by @{s.author_handle}</span>
                </div>
              </div>
              <div className="relative z-10">
                <FollowButton storyId={s.id} initial={followed.has(s.id)} signedIn={!!viewer} allowed={hasFeature(ent, "follow")} />
              </div>
            </li>
          ))}
        </ul>

        {stories.length === 0 && (
          <div className="px-1 py-10 text-sm text-faint">
            {tab === "following" && !viewer ? (
              <>
                <Link href="/login?next=/?tab=following">Sign in</Link> to see stories you follow.
              </>
            ) : tab === "following" ? (
              "Tap the star on any story to follow it, and it'll wait for you here."
            ) : (
              "No stories here yet. Then what? Someone starts one."
            )}
          </div>
        )}
      </FeedTabs>
    </div>
  );
}
