import { createClient } from "@/lib/supabase/server";
import type { Viewer } from "@/lib/queries";
import type {
  ReviewItem,
  ActivityRow,
  Capacity,
  DashboardStats,
  DashboardStory,
  DashboardUser,
  LimitRequest,
  RequestKind,
  RequestStatus,
  Role,
  Settings,
  StoryStatus,
} from "@/lib/types";

export const PAGE_SIZE = 25;

/** Keeps search text to letters, numbers and a few safe characters. */
export function cleanSearch(q: string | undefined): string {
  return (q ?? "").replace(/[^\p{L}\p{N} _.'-]/gu, "").trim().slice(0, 60);
}

export function pageFrom(raw: string | undefined): number {
  const n = Math.floor(Number(raw));
  return Number.isFinite(n) && n > 1 ? Math.min(n, 1000) : 1;
}

export async function getSettings(): Promise<Settings> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("app_settings")
    .select("max_branches_per_line, max_depth, lines_per_hour, auto_approve, updated_at")
    .single();
  return (data as Settings) ?? { max_branches_per_line: null, max_depth: null, lines_per_hour: 10, auto_approve: true, updated_at: "" };
}

export async function getCapacity(lineId: string): Promise<Capacity | null> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("line_capacity", { p_line: lineId });
  return ((data as Capacity[] | null) ?? [])[0] ?? null;
}

export async function getMyPendingKinds(viewer: Viewer, lineId: string): Promise<RequestKind[]> {
  if (!viewer) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("limit_requests")
    .select("kind")
    .eq("line_id", lineId)
    .eq("requester_id", viewer.id)
    .eq("status", "pending");
  return (data ?? []).map((r) => r.kind as RequestKind);
}

export async function getDashboardStats(): Promise<DashboardStats | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("dashboard_stats");
  if (error) return null;
  return data as DashboardStats;
}

const REQUEST_SELECT = `*,
  requester:profiles!limit_requests_requester_id_fkey(handle),
  decider:profiles!limit_requests_decided_by_fkey(handle),
  story:stories!limit_requests_story_id_fkey(title, slug, author_id),
  line:lines!limit_requests_line_id_fkey(text, depth)`;

export type RequestFilter = { status: RequestStatus | "all"; mine: boolean; page: number };

export async function getRequests(viewer: NonNullable<Viewer>, f: RequestFilter) {
  const supabase = await createClient();
  let q = supabase
    .from("limit_requests")
    .select(REQUEST_SELECT, { count: "exact" })
    .order("created_at", { ascending: f.status === "pending" })
    .range((f.page - 1) * PAGE_SIZE, f.page * PAGE_SIZE - 1);
  if (f.status !== "all") q = q.eq("status", f.status);
  if (f.mine) q = q.eq("requester_id", viewer.id);
  const { data, count } = await q;
  return { rows: (data ?? []) as unknown as LimitRequest[], total: count ?? 0 };
}

export type StoryFilter = { q: string; status: StoryStatus | "all"; mine: boolean; page: number };

export async function getDashboardStories(viewer: NonNullable<Viewer>, f: StoryFilter) {
  const supabase = await createClient();
  let q = supabase
    .from("dashboard_stories")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range((f.page - 1) * PAGE_SIZE, f.page * PAGE_SIZE - 1);
  // Authors only manage their own stories; admins see everything.
  if (viewer.profile.role !== "admin" || f.mine) q = q.eq("author_id", viewer.id);
  if (f.status !== "all") q = q.eq("status", f.status);
  if (f.q) q = q.ilike("title", `%${f.q}%`);
  const { data, count } = await q;
  return { rows: (data ?? []) as DashboardStory[], total: count ?? 0 };
}

export type UserFilter = { q: string; role: Role | "all"; page: number };

export async function getDashboardUsers(f: UserFilter) {
  const supabase = await createClient();
  let q = supabase
    .from("dashboard_users")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range((f.page - 1) * PAGE_SIZE, f.page * PAGE_SIZE - 1);
  if (f.role !== "all") q = q.eq("role", f.role);
  if (f.q) q = q.ilike("handle", `%${f.q}%`);
  const { data, count } = await q;
  return { rows: (data ?? []) as DashboardUser[], total: count ?? 0 };
}

export const ACTIVITY_GROUPS: Record<string, { label: string; prefix: string }> = {
  all: { label: "Everything", prefix: "" },
  story: { label: "Stories", prefix: "story." },
  line: { label: "Lines", prefix: "line." },
  request: { label: "Requests", prefix: "request." },
  user: { label: "People", prefix: "user." },
  invite: { label: "Invites", prefix: "invite." },
  settings: { label: "Settings", prefix: "settings." },
  plan: { label: "Plans", prefix: "plan." },
};

export async function getActivity(group: string, page: number, limit = PAGE_SIZE) {
  const supabase = await createClient();
  let q = supabase
    .from("activity")
    .select(
      `id, action, details, created_at, line_id,
       actor:profiles!activity_actor_id_fkey(handle),
       subject:profiles!activity_subject_id_fkey(handle),
       story:stories!activity_story_id_fkey(title, slug)`,
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .range((page - 1) * limit, page * limit - 1);
  const prefix = ACTIVITY_GROUPS[group]?.prefix;
  if (prefix) q = q.like("action", `${prefix}%`);
  const { data, count } = await q;
  return { rows: (data ?? []) as unknown as ActivityRow[], total: count ?? 0 };
}

/** Lines and edits waiting for approval in stories this person can see (RLS decides which). */
export async function getReviewQueue(viewer: NonNullable<Viewer>, mine: boolean, page: number) {
  const supabase = await createClient();
  let q = supabase
    .from("lines")
    .select(
      `*, author:profiles!lines_author_id_fkey(handle),
       story:stories!lines_story_id_fkey(title, slug, author_id),
       parent:lines!lines_parent_id_fkey(text)`,
      { count: "exact" },
    )
    .or("status.eq.pending,pending_text.not.is.null")
    .order("created_at", { ascending: true })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (mine) q = q.eq("author_id", viewer.id);
  const { data, count } = await q;
  return { rows: (data ?? []) as unknown as ReviewItem[], total: count ?? 0 };
}
