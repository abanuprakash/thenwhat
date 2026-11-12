import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getProfileByHandle,
  getProfileById,
  getProfileStats,
  getRecentLinesByAuthor,
  getStoriesByAuthor,
  getEntitlements,
  getViewer,
} from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";
import { Avatar } from "@/components/Avatar";
import { ProfileEditor } from "@/components/ProfileEditor";
import { formatNum, plural, timeAgo, truncate } from "@/lib/format";

type Props = { params: Promise<{ handle: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { handle } = await params;
  return { title: `@${decodeURIComponent(handle)}` };
}

export default async function ProfilePage({ params }: Props) {
  const { handle } = await params;
  const profile = await getProfileByHandle(decodeURIComponent(handle));
  if (!profile) notFound();

  const viewer = await getViewer();
  const isMe = viewer?.id === profile.id;
  const isAuthor = profile.role === "author" || profile.role === "admin";

  const [stats, stories, lines, inviter] = await Promise.all([
    getProfileStats(profile.id),
    getStoriesByAuthor(profile.id),
    getRecentLinesByAuthor(profile.id, 10),
    profile.invited_by ? getProfileById(profile.invited_by) : Promise.resolve(null),
  ]);

  // Private details (plan, Google photo) only for the person themselves.
  const ent = isMe ? await getEntitlements() : null;
  let hasGooglePhoto = false;
  if (isMe) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    hasGooglePhoto = Boolean(user?.user_metadata?.avatar_url ?? user?.user_metadata?.picture);
  }
  const slotsUsed = ent && isAuthor ? ent.invites_in_use : null;
  const slotsTotal = ent?.features?.invite?.quota ?? null;

  return (
    <div className="container-narrow">
      <div className="mb-[22px] flex items-center gap-[18px]">
        <Avatar url={profile.avatar_url} handle={profile.handle} size={64} />
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-serif text-[22px] font-semibold">{profile.display_name || profile.handle}</h1>
            {isAuthor && <span className="badge-gold">{profile.role === "admin" ? "Admin" : "Verified author"}</span>}
          </div>
          <span className="text-[13px] font-medium text-faint">@{profile.handle}</span>
        </div>
      </div>

      {profile.bio && <p className="mb-[22px] text-sm leading-relaxed text-muted">{profile.bio}</p>}

      <dl className="mb-[26px] flex gap-7 border-y border-black/[.08] py-[18px]">
        <div>
          <dd className="text-xl font-bold text-ink">{formatNum(stats.karma)}</dd>
          <dt className="text-[11px] font-medium text-faint">karma</dt>
        </div>
        {isAuthor && (
          <>
            <div>
              <dd className="text-xl font-bold text-ink">{formatNum(stats.stories_started)}</dd>
              <dt className="text-[11px] font-medium text-faint">stories started</dt>
            </div>
            <div>
              <dd className="text-xl font-bold text-ink">{formatNum(stats.lines_written)}</dd>
              <dt className="text-[11px] font-medium text-faint">lines written</dt>
            </div>
          </>
        )}
        {isMe && (
          <div>
            <dd className="text-xl font-bold text-ink">{formatNum(stats.following)}</dd>
            <dt className="text-[11px] font-medium text-faint">stories followed</dt>
          </div>
        )}
      </dl>

      {stories.length > 0 && (
        <section className="mb-[26px]">
          <h2 className="eyebrow mb-[10px]">Stories started</h2>
          <ul>
            {stories.map((s) => (
              <li key={s.id} className="flex justify-between gap-4 border-b border-black/[.06] py-[10px]">
                <Link href={`/s/${s.slug}`} className="font-serif text-sm text-ink hover:text-gold">
                  {s.title}
                </Link>
                <span className="whitespace-nowrap text-xs font-medium text-faint">
                  {plural(Math.max(s.line_count - 1, 0), "branch", "branches")} · {formatNum(s.vote_count)} votes
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {lines.length > 0 && (
        <section className="mb-[26px]">
          <h2 className="eyebrow mb-[10px]">Recent lines</h2>
          <ul>
            {lines.map((l) => (
              <li key={l.id} className="border-b border-black/[.06] py-[10px]">
                <Link href={`/s/${l.story?.slug}/${l.id}`} className="font-serif text-sm text-ink hover:text-gold">
                  {truncate(l.text, 140)}
                </Link>
                <div className="mt-1 text-[11px] font-medium text-faint">
                  in {l.story?.title} · {l.up - l.down} votes · {timeAgo(l.created_at)}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {isAuthor && (inviter || slotsUsed !== null) && (
        <section className="mb-[26px]">
          <h2 className="eyebrow mb-[10px]">Invite chain</h2>
          <p className="text-sm text-muted">
            {inviter ? (
              <>
                Invited by <Link href={`/u/${inviter.handle}`}>@{inviter.handle}</Link>
              </>
            ) : (
              "Founding author"
            )}
            {slotsUsed !== null && slotsTotal !== null && profile.role !== "admin" && <> · {slotsUsed}/{slotsTotal} invite slots used</>}
          </p>
        </section>
      )}

      {!isAuthor && isMe && (
        <div className="panel mb-[26px] px-5 py-[18px] text-sm leading-relaxed text-muted">
          Only verified authors can write new lines. Get invited by an existing author to start writing.
        </div>
      )}

      {isMe && ent && (
        <section className="panel mb-[26px] flex flex-wrap items-center justify-between gap-3 px-5 py-4">
          <p className="text-sm text-ink">
            Your plan: <strong>{ent.plan_name}</strong>
            {ent.plan_expires_at && <span className="text-faint"> · until {new Date(ent.plan_expires_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>}
          </p>
          <Link href="/pricing" className="text-xs font-semibold">
            Compare plans
          </Link>
        </section>
      )}

      {isMe && viewer && (
        <ProfileEditor
          handle={profile.handle}
          displayName={profile.display_name ?? ""}
          bio={profile.bio ?? ""}
          avatarUrl={profile.avatar_url}
          hasGooglePhoto={hasGooglePhoto}
        />
      )}
    </div>
  );
}
