"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { canWrite, getViewer } from "@/lib/queries";
import {
  decisionSchema,
  FEATURES,
  handleSchema,
  lineReviewSchema,
  moderationSchema,
  planIdSchema,
  settingsSchema,
  storyLimitsSchema,
  storyStatusSchema,
  userPlanSchema,
  uuid,
} from "@/lib/schemas";
import { cleanText } from "@/lib/sanitize";
import { limit, TOO_MANY } from "@/lib/security";
import { fieldErrors, friendly, type FormState } from "@/lib/action-utils";
import type { Role } from "@/lib/types";

/*
 * Dashboard actions. Each one first confirms the caller is an author or admin (and, for the
 * admin-only ones, an admin), then the database function checks ownership and plan again.
 */

async function requireDashboard(adminOnly = false): Promise<{ id: string; isAdmin: boolean } | { error: string }> {
  const viewer = await getViewer();
  if (!viewer || !canWrite(viewer)) return { error: "You don't have access to that." };
  const isAdmin = viewer.profile.role === "admin";
  if (adminOnly && !isAdmin) return { error: "Admins only." };
  if (!(await limit(isAdmin ? "adminPerUser" : "reviewPerUser", viewer.id))) return { error: TOO_MANY };
  return { id: viewer.id, isAdmin };
}

function refresh() {
  revalidatePath("/", "layout");
}

// ── Approving lines and edits ───────────────────────────────────────────

export async function reviewLine(_: FormState, formData: FormData): Promise<FormState> {
  const gate = await requireDashboard();
  if ("error" in gate) return { error: gate.error };
  const parsed = lineReviewSchema.safeParse({
    lineId: formData.get("lineId"),
    approve: formData.get("approve"),
    note: formData.get("note") ?? "",
  });
  if (!parsed.success) return fieldErrors(parsed.error);
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("review_line", {
    p_line: parsed.data.lineId,
    p_approve: parsed.data.approve === "yes",
    p_note: parsed.data.note || null,
  });
  if (error) return { error: friendly(error) };
  refresh();
  return { ok: String(data).includes("approved") ? "Published." : "Not published." };
}

export async function setStoryModeration(_: FormState, formData: FormData): Promise<FormState> {
  const gate = await requireDashboard();
  if ("error" in gate) return { error: gate.error };
  const parsed = moderationSchema.safeParse({ storyId: formData.get("storyId"), mode: formData.get("mode") });
  if (!parsed.success) return { error: "Invalid request." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_story_moderation", {
    p_story: parsed.data.storyId,
    p_auto_approve: parsed.data.mode === "inherit" ? null : parsed.data.mode === "auto",
  });
  if (error) return { error: friendly(error) };
  refresh();
  return { ok: "Approval setting saved." };
}

// ── Limit requests ──────────────────────────────────────────────────────

export async function decideRequest(_: FormState, formData: FormData): Promise<FormState> {
  const gate = await requireDashboard();
  if ("error" in gate) return { error: gate.error };
  const parsed = decisionSchema.safeParse({
    requestId: formData.get("requestId"),
    approve: formData.get("approve"),
    granted: formData.get("granted") || undefined,
    note: formData.get("note") ?? "",
  });
  if (!parsed.success) return fieldErrors(parsed.error);
  const approve = parsed.data.approve === "yes";
  if (approve && !parsed.data.granted) return { fieldErrors: { granted: ["Choose how many to grant."] } };
  const supabase = await createClient();
  const { error } = await supabase.rpc("decide_limit_request", {
    p_request: parsed.data.requestId,
    p_approve: approve,
    p_granted: approve ? parsed.data.granted : null,
    p_note: parsed.data.note || null,
  });
  if (error) return { error: friendly(error) };
  refresh();
  return { ok: approve ? "Approved." : "Declined." };
}

// ── Stories ─────────────────────────────────────────────────────────────

export async function setStoryStatus(_: FormState, formData: FormData): Promise<FormState> {
  const gate = await requireDashboard();
  if ("error" in gate) return { error: gate.error };
  const parsed = storyStatusSchema.safeParse({
    storyId: formData.get("storyId"),
    status: formData.get("status"),
    reason: formData.get("reason") ?? "",
  });
  if (!parsed.success) return { error: "Invalid request." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_story_status", {
    p_story: parsed.data.storyId,
    p_status: parsed.data.status,
    p_reason: parsed.data.reason || null,
  });
  if (error) return { error: friendly(error) };
  refresh();
  return { ok: parsed.data.status === "inactive" ? "Story is now inactive." : "Story is active again." };
}

export async function setStoryLimits(_: FormState, formData: FormData): Promise<FormState> {
  const gate = await requireDashboard();
  if ("error" in gate) return { error: gate.error };
  const parsed = storyLimitsSchema.safeParse({
    storyId: formData.get("storyId"),
    maxBranches: formData.get("maxBranches"),
    maxDepth: formData.get("maxDepth"),
  });
  if (!parsed.success) return fieldErrors(parsed.error);
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_story_limits", {
    p_story: parsed.data.storyId,
    p_max_branches: parsed.data.maxBranches,
    p_max_depth: parsed.data.maxDepth,
  });
  if (error) return { error: friendly(error) };
  refresh();
  return { ok: "Story limits saved." };
}

// ── Admin: site settings ────────────────────────────────────────────────

export async function updateSettings(_: FormState, formData: FormData): Promise<FormState> {
  const gate = await requireDashboard(true);
  if ("error" in gate) return { error: gate.error };
  const parsed = settingsSchema.safeParse({
    maxBranches: formData.get("maxBranches"),
    maxDepth: formData.get("maxDepth"),
    linesPerHour: formData.get("linesPerHour"),
    autoApprove: formData.get("autoApprove"),
  });
  if (!parsed.success) return fieldErrors(parsed.error);
  const supabase = await createClient();
  const { error } = await supabase.rpc("update_settings", {
    p_max_branches: parsed.data.maxBranches,
    p_max_depth: parsed.data.maxDepth,
    p_lines_per_hour: parsed.data.linesPerHour,
    p_auto_approve: parsed.data.autoApprove === "yes",
  });
  if (error) return { error: friendly(error) };
  refresh();
  return { ok: "Settings saved. They apply to new lines straight away." };
}

// ── Admin: people ───────────────────────────────────────────────────────

export async function adminSetRole(_: FormState, formData: FormData): Promise<FormState> {
  const gate = await requireDashboard(true);
  if ("error" in gate) return { error: gate.error };
  const handle = handleSchema.safeParse(formData.get("handle"));
  const role = String(formData.get("role") ?? "") as Role;
  if (!handle.success || !["reader", "author", "admin"].includes(role)) return { error: "Pick a handle and a role." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_set_role", { p_handle: handle.data, p_role: role });
  if (error) return { error: friendly(error) };
  refresh();
  return { ok: `Role saved for @${handle.data}.` };
}

export async function adminSetPlan(_: FormState, formData: FormData): Promise<FormState> {
  const gate = await requireDashboard(true);
  if ("error" in gate) return { error: gate.error };
  const parsed = userPlanSchema.safeParse({
    handle: formData.get("handle"),
    plan: formData.get("plan"),
    expiresAt: formData.get("expiresAt"),
  });
  if (!parsed.success) return fieldErrors(parsed.error);
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_set_plan", {
    p_handle: parsed.data.handle,
    p_plan: parsed.data.plan,
    // End of the chosen day, India time.
    p_expires_at: parsed.data.expiresAt ? `${parsed.data.expiresAt}T23:59:59+05:30` : null,
  });
  if (error) return { error: friendly(error) };
  refresh();
  return { ok: `Plan saved for @${parsed.data.handle}.` };
}

export async function adminSetHidden(lineId: string, hidden: boolean): Promise<{ error?: string }> {
  const gate = await requireDashboard(true);
  if ("error" in gate) return { error: gate.error };
  if (!uuid.safeParse(lineId).success || typeof hidden !== "boolean") return { error: "Invalid request." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_set_hidden", { p_line: lineId, p_hidden: hidden });
  if (error) return { error: friendly(error) };
  refresh();
  return {};
}

// ── Admin: plans ────────────────────────────────────────────────────────

export async function adminSavePlan(_: FormState, formData: FormData): Promise<FormState> {
  const gate = await requireDashboard(true);
  if ("error" in gate) return { error: gate.error };
  const plan = planIdSchema.safeParse(formData.get("planId"));
  if (!plan.success) return { error: "Unknown plan." };
  const name = cleanText(formData.get("name"), { multiline: false });
  const description = cleanText(formData.get("description"), { multiline: false });
  const price = Number(formData.get("price"));
  if (!name || name.length > 40) return { fieldErrors: { name: ["1–40 characters."] } };
  if (description.length > 280) return { fieldErrors: { description: ["Up to 280 characters."] } };
  if (!Number.isInteger(price) || price < 0 || price > 1_000_000) return { fieldErrors: { price: ["A whole number of rupees."] } };

  const features: Record<string, { enabled: boolean; quota: number | null }> = {};
  for (const f of FEATURES) {
    const rawQuota = formData.get(`quota_${f}`);
    let quota: number | null = null;
    if (typeof rawQuota === "string" && rawQuota.trim() !== "") {
      quota = Number(rawQuota);
      if (!Number.isInteger(quota) || quota < 0 || quota > 100000) return { error: `The limit for "${f}" must be a whole number.` };
    }
    features[f] = { enabled: formData.get(`feature_${f}`) === "on", quota };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_save_plan", {
    p_plan: plan.data,
    p_name: name,
    p_description: description || null,
    p_price_inr: price,
    p_active: formData.get("active") === "on",
    p_features: features,
  });
  if (error) return { error: friendly(error) };
  refresh();
  return { ok: "Plan saved." };
}
