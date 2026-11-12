export type Role = "reader" | "author" | "admin";

export const GENRES = ["Sci-fi", "Mystery", "Fantasy", "Drama", "Literary", "Horror", "Comedy"] as const;
export type Genre = (typeof GENRES)[number];

export type Profile = {
  id: string;
  handle: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  role: Role;
  invited_by: string | null;
  created_at: string;
  onboarded: boolean;
};

/** Profile columns ordinary users may read (plan details are private). */
export const PROFILE_COLUMNS = "id, handle, display_name, bio, avatar_url, role, invited_by, created_at, onboarded";

export type Story = {
  id: string;
  slug: string;
  title: string;
  genre: Genre;
  author_id: string;
  root_line_id: string | null;
  line_count: number;
  vote_count: number;
  finished: boolean;
  created_at: string;
  status?: "active" | "inactive";
  status_reason?: string | null;
};

export type FeedStory = Story & {
  author_handle: string;
  opening_line: string | null;
  trending_score: number;
};

export type Line = {
  id: string;
  story_id: string;
  parent_id: string | null;
  author_id: string;
  text: string;
  path: string;
  depth: number;
  up: number;
  down: number;
  score: number;
  children: number;
  is_complete: boolean;
  hidden: boolean;
  created_at: string;
  status: LineStatus;
  review_note: string | null;
  pending_text: string | null;
  pending_text_at: string | null;
  edited_at: string | null;
};

export type LineStatus = "pending" | "published" | "rejected";

export type LineWithAuthor = Line & { author: { handle: string } | null };

export type VoteValue = 1 | -1;

export type StoryStatus = "active" | "inactive";

export type Settings = {
  max_branches_per_line: number | null;
  max_depth: number | null;
  lines_per_hour: number;
  auto_approve: boolean;
  updated_at: string;
};

/** What a line allows right now (from line_capacity()). */
export type Capacity = {
  children: number;
  branch_limit: number | null;
  depth: number;
  max_depth: number | null;
  story_status: StoryStatus;
  is_complete: boolean;
};

export type RequestKind = "more_branches" | "more_depth";
export type RequestStatus = "pending" | "approved" | "rejected" | "cancelled";

export type LimitRequest = {
  id: string;
  kind: RequestKind;
  story_id: string;
  line_id: string;
  requester_id: string;
  message: string;
  status: RequestStatus;
  granted: number | null;
  decision_note: string | null;
  decided_at: string | null;
  created_at: string;
  requester: { handle: string } | null;
  decider: { handle: string } | null;
  story: { title: string; slug: string; author_id: string } | null;
  line: { text: string; depth: number } | null;
};

export type DashboardStory = {
  id: string;
  slug: string;
  title: string;
  genre: string;
  status: StoryStatus;
  status_reason: string | null;
  status_changed_at: string | null;
  author_id: string;
  author_handle: string;
  created_at: string;
  finished: boolean;
  line_count: number;
  vote_count: number;
  max_branches_override: number | null;
  max_depth_override: number | null;
  effective_max_branches: number | null;
  effective_max_depth: number | null;
  longest_path: number;
  pending_requests: number;
  auto_approve_override: boolean | null;
  effective_auto_approve: boolean;
  pending_lines: number;
};

export type DashboardUser = {
  id: string;
  handle: string;
  display_name: string | null;
  avatar_url: string | null;
  role: Role;
  created_at: string;
  invited_by_handle: string | null;
  lines_written: number;
  stories_started: number;
  last_active: string | null;
  plan_id: string;
  plan_expires_at: string | null;
  onboarded: boolean;
};

export type ActivityRow = {
  id: number;
  action: string;
  details: Record<string, unknown>;
  created_at: string;
  line_id: string | null;
  actor: { handle: string } | null;
  subject: { handle: string } | null;
  story: { title: string; slug: string } | null;
};

export type DashboardStats = {
  scope: "site" | "mine";
  users: Partial<Record<Role, number>> | null;
  stories_active: number;
  stories_inactive: number;
  lines_7d: number;
  pending_requests: number;
  my_pending_requests: number;
  open_reports: number | null;
  pending_lines: number;
  my_pending_lines: number;
  plans: Record<string, number> | null;
};

export type FeatureState = { enabled: boolean; quota: number | null };

export type Entitlements = {
  plan: string;
  plan_name: string;
  plan_expires_at: string | null;
  features: Record<string, FeatureState>;
  stories_started: number;
  invites_in_use: number;
};

export type Plan = {
  id: string;
  name: string;
  description: string | null;
  price_inr: number;
  sort: number;
  active: boolean;
  features: Record<string, FeatureState>;
};

export type ReviewItem = Line & {
  author: { handle: string } | null;
  story: { title: string; slug: string; author_id: string } | null;
  parent: { text: string } | null;
};
