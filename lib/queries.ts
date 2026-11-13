import { cache } from "react";
import { headers } from "next/headers";
import { VIEWER_HEADER, decodeViewer } from "@/lib/viewer-header";
import { createClient } from "@/lib/supabase/server";
import { PROFILE_COLUMNS, VIEWER_PROFILE_COLUMNS, type Entitlements, type FeedStory, type Line, type LineWithAuthor, type Plan, type Profile, type Story, type VoteValue } from "@/lib/types";

export const BRANCH_PAGE = 5;

const LINE_WITH_AUTHOR = "*, author:profiles!lines_author_id_fkey(handle)";

export type Viewer = { id: string; email: string | null; profile: Profile } | null;

/**
 * The signed-in user and their profile, once per request.
 * Page loads use what the middleware already checked (lib/viewer-header.ts); Server Actions and
 * anything the middleware skipped ask Supabase directly.
 */
export const getViewer = cache(async (): Promise<Viewer> => {
  const handed = decodeViewer((await headers()).get(VIEWER_HEADER));
  if (handed !== undefined) return handed ? { id: handed.id, email: handed.email, profile: handed.profile as Profile } : null;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from("profiles").select(VIEWER_PROFILE_COLUMNS).eq("id", user.id).single();
  if (!profile) return null;
  return { id: user.id, email: user.email ?? null, profile: profile as Profile };
});

export async function getLiveUpdates(): Promise<{ on: boolean; seconds: number }> {
  const supabase = await createClient();
  const { data } = await supabase.from("app_settings").select("live_updates, poll_seconds").maybeSingle();
  const row = data as { live_updates: boolean; poll_seconds: number } | null;
  return row ? { on: row.live_updates, seconds: row.poll_seconds } : { on: false, seconds: 15 };
}

/** For admin-only pages: middleware gates them too, this is the second lock. */
export async function requireAdmin() {
  const { redirect } = await import("next/navigation");
  const viewer = await getViewer();
  if (viewer?.profile.role !== "admin") redirect(viewer ? "/dashboard" : "/login");
  return viewer!;
}

/** What the signed-in person's plan includes (admins: everything). */
export const getEntitlements = cache(async (): Promise<Entitlements | null> => {
  // Page loads: the middleware already said whether anyone is signed in. Server Actions: ask the
  // database directly (it knows who's calling) rather than looking the user up again, because
  // React's per-request cache doesn't apply inside actions.
  if (decodeViewer((await headers()).get(VIEWER_HEADER)) === null) return null;
  const supabase = await createClient();
  const { data } = await supabase.rpc("my_entitlements");
  return (data as Entitlements) ?? null;
});

export function hasFeature(ent: Entitlements | null, feature: string): boolean {
  return Boolean(ent?.features?.[feature]?.enabled);
}

export async function getPlans(includeInactive = false): Promise<Plan[]> {
  const supabase = await createClient();
  let q = supabase.from("plans").select("*, plan_features(feature, enabled, quota)").order("sort");
  if (!includeInactive) q = q.eq("active", true);
  const { data } = await q;
  return ((data ?? []) as (Omit<Plan, "features"> & { plan_features: { feature: string; enabled: boolean; quota: number | null }[] })[]).map(
    ({ plan_features, ...p }) => ({
      ...p,
      features: Object.fromEntries(plan_features.map((f) => [f.feature, { enabled: f.enabled, quota: f.quota }])),
    }),
  );
}

export function canWrite(viewer: Viewer): boolean {
  return viewer?.profile.role === "author" || viewer?.profile.role === "admin";
}

export type FeedTab = "trending" | "new" | "top" | "finished" | "following";
export const FEED_TABS: { key: FeedTab; label: string }[] = [
  { key: "trending", label: "Trending" },
  { key: "new", label: "New" },
  { key: "top", label: "Top" },
  { key: "finished", label: "Finished" },
  { key: "following", label: "Following" },
];

export async function getFeed(tab: FeedTab, viewer: Viewer, limit = 30): Promise<FeedStory[]> {
  const supabase = await createClient();
  let q = supabase.from("story_feed").select("*").limit(limit);

  switch (tab) {
    case "new":
      q = q.order("created_at", { ascending: false });
      break;
    case "top":
      q = q.order("vote_count", { ascending: false }).order("line_count", { ascending: false });
      break;
    case "finished":
      q = q.eq("finished", true).order("vote_count", { ascending: false });
      break;
    case "following": {
      if (!viewer) return [];
      const { data: follows } = await supabase.from("follows").select("story_id").eq("user_id", viewer.id);
      const ids = (follows ?? []).map((f) => f.story_id as string);
      if (ids.length === 0) return [];
      q = q.in("id", ids).order("created_at", { ascending: false });
      break;
    }
    default:
      q = q.order("trending_score", { ascending: false });
  }

  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as FeedStory[];
}

export async function getFollowedIds(viewer: Viewer): Promise<Set<string>> {
  if (!viewer) return new Set();
  const supabase = await createClient();
  const { data } = await supabase.from("follows").select("story_id").eq("user_id", viewer.id);
  return new Set((data ?? []).map((f) => f.story_id as string));
}

export const getStoryBySlug = cache(async (slug: string): Promise<Story | null> => {
  const supabase = await createClient();
  const { data } = await supabase.from("stories").select("*").eq("slug", slug).maybeSingle();
  return (data as Story) ?? null;
});

export const getLine = cache(async (id: string): Promise<LineWithAuthor | null> => {
  const supabase = await createClient();
  const { data } = await supabase.from("lines").select(LINE_WITH_AUTHOR).eq("id", id).maybeSingle();
  return (data as LineWithAuthor) ?? null;
});

/** Root → current line. One ltree query (path @> current). */
export const getAncestors = cache(async (lineId: string): Promise<LineWithAuthor[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("line_ancestors", { p_line: lineId });
  if (error) throw error;
  const lines = (data ?? []) as Line[];
  const handles = await getHandles(lines.map((l) => l.author_id));
  return lines.map((l) => ({ ...l, author: handles.get(l.author_id) ?? null }));
});

/** Children of a line ranked by score, LIMIT/OFFSET for "Show more branches". */
export async function getBranches(
  lineId: string,
  limit: number,
): Promise<{ branches: LineWithAuthor[]; hasMore: boolean }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("lines")
    .select(LINE_WITH_AUTHOR)
    .eq("parent_id", lineId)
    .eq("hidden", false)
    .order("score", { ascending: false })
    .order("created_at", { ascending: false })
    .range(0, limit); // one extra row tells us if there are more
  if (error) throw error;
  // RLS only returns pending/rejected lines to their writer, the starter and admins; list those after published ones.
  const rank = { published: 0, pending: 1, rejected: 2 } as const;
  const rows = ((data ?? []) as LineWithAuthor[]).sort((a, b) => rank[a.status] - rank[b.status]);
  return { branches: rows.slice(0, limit), hasMore: rows.length > limit };
}

/** Tree map: the subtree under a line, a few levels deep. One ltree query (path <@ node). */
export async function getSubtree(lineId: string, levels: number): Promise<LineWithAuthor[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("line_subtree", { p_line: lineId, p_levels: levels });
  if (error) throw error;
  const lines = (data ?? []) as Line[];
  const handles = await getHandles(lines.map((l) => l.author_id));
  return lines.map((l) => ({ ...l, author: handles.get(l.author_id) ?? null }));
}

export async function getMyVotes(viewer: Viewer, lineIds: string[]): Promise<Record<string, VoteValue>> {
  if (!viewer || lineIds.length === 0) return {};
  const supabase = await createClient();
  const { data } = await supabase
    .from("votes")
    .select("line_id, value")
    .eq("user_id", viewer.id)
    .in("line_id", lineIds);
  return Object.fromEntries((data ?? []).map((v) => [v.line_id as string, v.value as VoteValue]));
}

export async function isFollowing(viewer: Viewer, storyId: string): Promise<boolean> {
  if (!viewer) return false;
  const supabase = await createClient();
  const { count } = await supabase
    .from("follows")
    .select("*", { count: "exact", head: true })
    .eq("user_id", viewer.id)
    .eq("story_id", storyId);
  return (count ?? 0) > 0;
}

async function getHandles(ids: string[]): Promise<Map<string, { handle: string }>> {
  const unique = [...new Set(ids)];
  if (unique.length === 0) return new Map();
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("id, handle").in("id", unique);
  return new Map((data ?? []).map((p) => [p.id as string, { handle: p.handle as string }]));
}

export const getProfileByHandle = cache(async (handle: string): Promise<Profile | null> => {
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select(PROFILE_COLUMNS).eq("handle", handle.toLowerCase()).maybeSingle();
  return (data as Profile) ?? null;
});

export type ProfileStats = { karma: number; lines_written: number; stories_started: number; following: number };

export async function getProfileStats(id: string): Promise<ProfileStats> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profile_stats")
    .select("karma, lines_written, stories_started, following")
    .eq("id", id)
    .maybeSingle();
  return (data as ProfileStats) ?? { karma: 0, lines_written: 0, stories_started: 0, following: 0 };
}

export async function getStoriesByAuthor(id: string): Promise<Story[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("stories")
    .select("*")
    .eq("author_id", id)
    .order("created_at", { ascending: false })
    .limit(50);
  return (data ?? []) as Story[];
}

export type LineWithStory = Line & { story: { slug: string; title: string } | null };

export async function getRecentLinesByAuthor(id: string, limit = 20): Promise<LineWithStory[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("lines")
    .select("*, story:stories!lines_story_id_fkey(slug, title)")
    .eq("author_id", id)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as LineWithStory[];
}

export type InviteRow = {
  token: string;
  used_by: string | null;
  used_at: string | null;
  expires_at: string;
  created_at: string;
  invitee: { handle: string } | null;
};

export async function getMyInvites(viewer: NonNullable<Viewer>): Promise<InviteRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("invites")
    .select("token, used_by, used_at, expires_at, created_at, invitee:profiles!invites_used_by_fkey(handle)")
    .eq("inviter_id", viewer.id)
    .order("created_at", { ascending: false });
  return (data ?? []) as unknown as InviteRow[];
}

export async function getProfileById(id: string): Promise<Profile | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select(PROFILE_COLUMNS).eq("id", id).maybeSingle();
  return (data as Profile) ?? null;
}

export type ReportedLine = {
  line: LineWithAuthor & { story: { slug: string; title: string } | null };
  reports: { reason: string | null; created_at: string; reporter: { handle: string } | null }[];
};

export async function getOpenReports(): Promise<ReportedLine[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("reports")
    .select("line_id, reason, created_at, reporter:profiles!reports_reporter_id_fkey(handle)")
    .eq("resolved", false)
    .order("created_at", { ascending: false })
    .limit(200);
  const rows = (data ?? []) as unknown as {
    line_id: string;
    reason: string | null;
    created_at: string;
    reporter: { handle: string } | null;
  }[];
  if (rows.length === 0) return [];

  const ids = [...new Set(rows.map((r) => r.line_id))];
  const { data: lines } = await supabase
    .from("lines")
    .select(`${LINE_WITH_AUTHOR}, story:stories!lines_story_id_fkey(slug, title)`)
    .in("id", ids);
  const byId = new Map((lines ?? []).map((l) => [l.id as string, l]));

  return ids
    .filter((id) => byId.has(id))
    .map((id) => ({
      line: byId.get(id) as ReportedLine["line"],
      reports: rows.filter((r) => r.line_id === id),
    }));
}
